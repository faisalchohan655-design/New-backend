import Lead from '../models/Lead.js';

export const getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.status(200).json({ 
      success: true, 
      total: leads.length,
      leads: leads 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    await Lead.findByIdAndDelete(id);
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveLeads = async (leads) => {
  try {
    await Lead.deleteMany({});
    if (leads.length > 0) {
      const formattedLeads = leads.map(lead => ({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        website: lead.website || '',
        address: lead.address || '',
        rating: lead.rating ? Number(lead.rating) : 0,
        placeId: lead.placeId || null,
        source: 'Google Maps',
        city: lead.city || '',
        interest: lead.interest || '',
        postUrl: lead.postUrl || '',
        snippet: lead.snippet || ''
      }));
      await Lead.insertMany(formattedLeads);
    }
    console.log(`${leads.length} leads saved to MongoDB`);
  } catch (error) {
    console.error('Save leads error:', error);
  }
};
