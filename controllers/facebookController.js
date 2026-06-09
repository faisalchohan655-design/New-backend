import { fetchFacebookPageData } from '../utils/facebookScraper.js';
import Lead from '../models/Lead.js';

export const scrapeFacebook = async (req, res) => {
  try {
    const { pageUrl, filters } = req.body;
    if (!pageUrl) return res.status(400).json({ error: 'Facebook Page URL required' });

    const scrapedLeads = await fetchFacebookPageData(pageUrl);
    if (!scrapedLeads.length) return res.json({ message: 'No leads found', leads: [] });

    let filteredLeads = scrapedLeads;
    if (filters?.requireEmail) filteredLeads = filteredLeads.filter(l => l.email);
    if (filters?.requirePhone) filteredLeads = filteredLeads.filter(l => l.phone);
    if (filters?.requireWebsite) filteredLeads = filteredLeads.filter(l => l.website);

    const saved = [];
    for (const lead of filteredLeads) {
      const updated = await Lead.findOneAndUpdate(
        { placeId: lead.placeId || lead.name },
        { $set: { ...lead, placeId: lead.placeId || lead.name, platform: 'facebook' } },
        { upsert: true, new: true }
      );
      saved.push(updated);
    }
    res.json({ message: `✅ Saved ${saved.length} Facebook leads`, leads: saved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
