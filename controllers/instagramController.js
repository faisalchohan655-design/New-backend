import { fetchInstagramProfileData } from '../utils/instagramScraper.js';
import Lead from '../models/Lead.js';

export const scrapeInstagram = async (req, res) => {
  try {
    const { profileUrl, filters } = req.body;
    if (!profileUrl) return res.status(400).json({ error: 'Instagram URL required' });

    const scrapedLeads = await fetchInstagramProfileData(profileUrl);
    if (!scrapedLeads.length) return res.json({ message: 'No leads found', leads: [] });

    let filteredLeads = scrapedLeads;
    if (filters?.requireEmail) filteredLeads = filteredLeads.filter(l => l.email);
    if (filters?.requirePhone) filteredLeads = filteredLeads.filter(l => l.phone);
    if (filters?.requireWebsite) filteredLeads = filteredLeads.filter(l => l.website);

    const saved = [];
    for (const lead of filteredLeads) {
      const updated = await Lead.findOneAndUpdate(
        { placeId: lead.placeId },
        { $set: lead },
        { upsert: true, new: true }
      );
      saved.push(updated);
    }
    res.json({ message: `✅ Saved ${saved.length} Instagram leads`, leads: saved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
