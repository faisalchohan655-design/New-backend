import { scrapeGoogleMaps } from '../utils/serpapi.js';
import Lead from '../models/Lead.js';

export const startScraping = async (req, res) => {
  try {
    const { keyword, city, count, filters } = req.body;
    if (!keyword || !city || !count) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) return res.status(500).json({ error: 'No SerpAPI key' });

    const scraped = await scrapeGoogleMaps(keyword, city, parseInt(count), apiKey);
    let filtered = scraped;
    if (filters?.requireEmail) filtered = filtered.filter(l => l.email);
    if (filters?.requirePhone) filtered = filtered.filter(l => l.phone);
    if (filters?.requireWebsite) filtered = filtered.filter(l => l.website);

    const saved = [];
    for (const lead of filtered) {
      const updated = await Lead.findOneAndUpdate(
        { placeId: lead.placeId },
        { $set: lead },
        { upsert: true, new: true }
      );
      saved.push(updated);
    }
    res.json({ message: `Saved ${saved.length} leads`, leads: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
