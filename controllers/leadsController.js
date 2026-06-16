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

export const saveBulkLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    console.log('📦 Received leads:', leads?.length || 0);

    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads' });
    }

    const saved = [];

    for (const lead of leads) {
      try {
        // ✅ Generate unique placeId for each lead
        const placeId = `social_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // ✅ Always save – do NOT check for duplicates
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
        console.log(`✅ Saved: ${newLead.name}`);
      } catch (err) {
        console.error('❌ Error saving lead:', err.message);
      }
    }

    res.json({ success: true, saved: saved.length, total: leads.length });
  } catch (error) {
    console.error('❌ Bulk save error:', error);
    res.status(500).json({ error: error.message });
  }
};
