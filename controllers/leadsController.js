import Lead from '../models/Lead.js';

export const getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Lead.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Lead not found' });
    res.status(200).json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ ALWAYS SAVE – NO DUPLICATE CHECK
export const saveBulkLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    console.log('📦 [bulk] Received leads:', leads?.length || 0);

    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads to save' });
    }

    const saved = [];

    for (const lead of leads) {
      try {
        // ✅ Generate UNIQUE placeId every time
        const placeId = `social_${Date.now()}_${Math.random().toString(36).substring(7)}`;

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
        console.log(`✅ Saved: ${newLead.name} (${newLead.placeId})`);
      } catch (err) {
        console.error('❌ Error saving lead:', err.message);
      }
    }

    console.log(`📊 Summary: ${saved.length} saved`);
    res.json({ success: true, saved: saved.length, total: leads.length });
  } catch (error) {
    console.error('❌ Bulk save error:', error);
    res.status(500).json({ error: error.message });
  }
};
