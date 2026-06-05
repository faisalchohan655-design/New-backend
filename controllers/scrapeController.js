import { scrapeGoogleMaps } from '../utils/serpapi.js';
import Lead from '../models/Lead.js';

export const startScraping = async (req, res) => {
  try {
    const { keyword, city, count } = req.body;

    if (!keyword || !city || !count) {
      return res.status(400).json({ error: 'Missing required fields: keyword, city, count' });
    }

    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'SerpAPI key not configured' });
    }

    const scrapedLeads = await scrapeGoogleMaps(keyword, city, parseInt(count), apiKey);
    const savedLeads = [];

    for (const lead of scrapedLeads) {
      const updated = await Lead.findOneAndUpdate(
        { placeId: lead.placeId },
        { $set: lead },
        { upsert: true, new: true }
      );
      savedLeads.push(updated);
    }

    res.status(200).json({
      message: `✅ Successfully scraped and saved ${savedLeads.length} leads`,
      leads: savedLeads
    });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'Scraping failed', details: error.message });
  }
};
