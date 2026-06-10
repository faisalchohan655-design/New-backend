export const extractEmailsFromLeadIds = async (req, res) => {
  try {
    const { leadIds, deep = false, maxPagesPerUrl = 5 } = req.body;
    if (!leadIds || !leadIds.length) {
      return res.status(400).json({ error: 'No lead IDs provided' });
    }

    const leads = await Lead.find({ _id: { $in: leadIds }, website: { $ne: '', $exists: true } });
    const results = [];
    let totalNewEmails = 0;

    for (const lead of leads) {
      // Use the free extractEmailsFromUrl function from your utils
      const { extractEmailsFromUrl } = await import('../utils/emailExtractor.js');
      const extracted = await extractEmailsFromUrl(lead.website, deep, maxPagesPerUrl);
      for (const item of extracted) {
        const existing = await Lead.findOne({ email: item.email });
        if (!existing) {
          const newLead = new Lead({
            name: `Email from ${lead.website}`,
            email: item.email,
            phone: item.phone || '',
            website: lead.website,
            address: lead.address,
            rating: item.verified ? 3 : 1,
            placeId: `email_${Date.now()}_${Math.random()}`,
            source: 'email_extracted',
            parentLeadId: lead._id,
            createdAt: new Date()
          });
          await newLead.save();
          totalNewEmails++;
          results.push({ leadId: lead._id, website: lead.website, email: item.email, verified: item.verified });
        }
      }
    }
    res.json({ success: true, totalNewEmails, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
