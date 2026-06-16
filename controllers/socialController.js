export const saveSocialLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads to save' });
    }

    const saved = [];
    for (const lead of leads) {
      // Skip if no website or name
      if (!lead.website && !lead.name) continue;

      // Create a unique placeId
      const placeId = lead.placeId || `${lead.platform || 'social'}_${lead.website || Date.now()}`;

      // Check if lead already exists by website or email
      const existing = await Lead.findOne({
        $or: [
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
        console.log(`✅ Saved lead: ${newLead.name}`);
      } else {
        console.log(`⏭️ Lead already exists: ${lead.website || lead.email}`);
      }
    }

    res.json({ success: true, saved: saved.length, total: leads.length });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: error.message });
  }
};
