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

    // Apply quality filters
    let filteredLeads = scrapedLeads;
    if (filters?.requireEmail) {
      filteredLeads = filteredLeads.filter(l => l.email && l.email.trim() !== '');
    }
    if (filters?.requirePhone) {
      filteredLeads = filteredLeads.filter(l => l.phone && l.phone.trim() !== '');
    }
    if (filters?.requireWebsite) {
      filteredLeads = filteredLeads.filter(l => l.website && l.website.trim() !== '');
    }

    const savedLeads = [];
    for (const lead of filteredLeads) {
      const updated = await Lead.findOneAndUpdate(
        { placeId: lead.placeId },      // ✅ Use placeId, not _id or lead_id
        { $set: lead },
        { upsert: true, new: true }
      );
      savedLeads.push(updated);
    }

    res.status(200).json({
      message: `✅ Scraped ${scrapedLeads.length}, saved ${savedLeads.length} after filters`,
      leads: savedLeads,
      filteredOut: scrapedLeads.length - savedLeads.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
