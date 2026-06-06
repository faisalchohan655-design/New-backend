import { scrapeGoogleMaps } from '../utils/serpapi.js';
import Lead from '../models/Lead.js';

export const startScraping = async (req, res) => {
  try {
    const { keyword, city, count } = req.body;

    // 1. Validation
    if (!keyword || !city || !count) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: keyword, city, count' 
      });
    }

    if (parseInt(count) <= 0 || parseInt(count) > 100) {
      return res.status(400).json({ 
        success: false,
        error: 'Count must be between 1 and 100' 
      });
    }

    // 2. API Key check
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      console.error('SERPAPI_KEY not found in environment variables');
      return res.status(500).json({ 
        success: false,
        error: 'SerpAPI key not configured on server' 
      });
    }

    // 3. Scrape
    console.log(`Starting scrape: ${keyword} in ${city}, count: ${count}`);
    const scrapedLeads = await scrapeGoogleMaps(keyword, city, parseInt(count), apiKey);

    if (!scrapedLeads || scrapedLeads.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No leads found for this search',
        leads: []
      });
    }

    // 4. Save to MongoDB
    const savedLeads = [];
    for (const lead of scrapedLeads) {
      try {
        const updated = await Lead.findOneAndUpdate(
          { placeId: lead.placeId },
          { $set: lead },
          { upsert: true, new: true }
        );
        savedLeads.push(updated);
      } catch (dbErr) {
        console.error('DB save error for lead:', lead.placeId, dbErr.message);
      }
    }

    // 5. Success response - ✅ data بھیج رہے ہیں
    console.log(`✅ Saved ${savedLeads.length} leads`);
    return res.status(200).json({
      success: true,
      message: `Successfully scraped and saved ${savedLeads.length} leads`,
      data: savedLeads,
      count: savedLeads.length
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Scraping failed', 
      details: error.message 
    });
  }
};
