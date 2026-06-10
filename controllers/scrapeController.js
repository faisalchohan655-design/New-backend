import { scrapeGoogleMaps } from '../utils/serpapi.js';
import Lead from '../models/Lead.js';

export const startScraping = async (req, res) => {
  try {
    const { keyword, city, count, filters } = req.body;
    if (!keyword || !city || !count) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) return res.status(500).json({ error: 'SerpAPI key missing' });

    const scrapedLeads = await scrapeGoogleMaps(keyword, city, parseInt(count), apiKey);

    let filteredLeads = scrapedLeads;
    if (filters?.requireEmail) filteredLeads = filteredLeads.filter(l => l.email);
    if (filters?.requirePhone) filteredLeads = filteredLeads.filter(l => l.phone);
    if (filters?.requireWebsite) filteredLeads = filteredLeads.filter(l => l.website);

    const savedLeads = [];
    for (const lead of filteredLeads) {
      const updated = await Lead.findOneAndUpdate(
        { placeId: lead.placeId },
        { $set: lead },
        { upsert: true, new: true }
      );
      savedLeads.push(updated);
    }
    res.json({ message: `Saved ${savedLeads.length} leads`, leads: savedLeads });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
