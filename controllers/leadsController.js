import Lead from '../models/Lead.js';

// GET all leads
export const getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    console.log(`Fetched ${leads.length} leads from database`);
    res.status(200).json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE a single lead
export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Lead.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.status(200).json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: error.message });
  }
};

// BULK SAVE leads (for Social Insights)
export const saveBulkLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    console.log('📦 [bulk] Received leads:', leads?.length || 0);

    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads to save' });
    }

    const saved = [];
    const errors = [];

    for (const lead of leads) {
      try {
        if (!lead.name && !lead.website) {
          errors.push({ lead, error: 'No name or website' });
          continue;
        }

        const uniqueId = lead.website || lead.sourceUrl || lead.name || `lead_${Date.now()}`;
        const placeId = `${lead.platform || 'social'}_${uniqueId}`;

        const existing = await Lead.findOne({
          $or: [
            { placeId: placeId },
            { website: lead.website },
            { email: lead.email }
          ]
        });

        if (!existing) {
          const newLead = new Lead({
            name: lead.name || 'Unknown Business',
            phone: lead.phone || '',
            email: lead.email || '',
            website: lead.website || '',
            address: lead.address || '',
            rating: parseFloat(lead.rating) || 0,
            placeId: placeId,
            source: lead.platform || 'social',
            status: 'Untouched',
            createdAt: new Date()
          });
          await newLead.save();
          saved.push(newLead);
          console.log(`✅ Saved lead: ${newLead.name} (${newLead.placeId})`);
        } else {
          console.log(`⏭️ Lead already exists: ${lead.name || lead.website}`);
        }
      } catch (err) {
        console.error('❌ Error saving lead:', err.message);
        errors.push({ lead, error: err.message });
      }
    }

    console.log(`📊 Summary: ${saved.length} saved, ${errors.length} errors`);

    res.json({
      success: true,
      saved: saved.length,
      total: leads.length,
      errors: errors.length > 0 ? errors : undefined,
      savedLeads: saved
    });
  } catch (error) {
    console.error('❌ Bulk save error:', error);
    res.status(500).json({ error: error.message });
  }
};
