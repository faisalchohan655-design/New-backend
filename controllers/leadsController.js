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

// BULK SAVE leads (for Social Insights / any bulk import)
export const saveBulkLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads to save' });
    }

    const saved = [];
    for (const lead of leads) {
      // Avoid duplicates by checking email or website
      const existing = await Lead.findOne({
        $or: [
          { email: lead.email },
          { website: lead.website }
        ]
      });
      if (!existing) {
        const newLead = new Lead({
          name: lead.name,
          phone: lead.phone || '',
          email: lead.email || '',
          website: lead.website || '',
          address: lead.address || '',
          rating: parseFloat(lead.rating) || 0,
          placeId: `${lead.platform || 'social'}_${lead.sourceUrl || Date.now()}`,
          source: lead.platform || 'social',
          status: 'Untouched',
          createdAt: new Date()
        });
        await newLead.save();
        saved.push(newLead);
      }
    }
    res.status(200).json({ success: true, saved: saved.length, total: leads.length });
  } catch (error) {
    console.error('Bulk save error:', error);
    res.status(500).json({ error: error.message });
  }
};
