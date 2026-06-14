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
    console.log(`Scraped ${scrapedLeads.length} leads from SerpAPI`);

    // Apply quality filters
    let filteredLeads = scrapedLeads;
    if (filters?.requireEmail) filteredLeads = filteredLeads.filter(l => l.email && l.email.trim() !== '');
    if (filters?.requirePhone) filteredLeads = filteredLeads.filter(l => l.phone && l.phone.trim() !== '');
    if (filters?.requireWebsite) filteredLeads = filteredLeads.filter(l => l.website && l.website.trim() !== '');

    console.log(`After filters: ${filteredLeads.length} leads`);

    const savedLeads = [];
    for (const lead of filteredLeads) {
      try {
        const updated = await Lead.findOneAndUpdate(
          { placeId: lead.placeId },
          { 
            $set: {
              name: lead.name,
              phone: lead.phone,
              email: lead.email,
              website: lead.website,
              address: lead.address,
              rating: lead.rating,
              placeId: lead.placeId,
              source: 'Google Maps',
              createdAt: new Date()
            }
          },
          { upsert: true, new: true }
        );
        savedLeads.push(updated);
        console.log(`Saved lead: ${lead.name}`);
      } catch (err) {
        console.error(`Error saving lead ${lead.name}:`, err.message);
      }
    }

    console.log(`Successfully saved ${savedLeads.length} leads to database`);

    res.status(200).json({
      message: `✅ Scraped ${scrapedLeads.length}, saved ${savedLeads.length} after filters`,
      leads: savedLeads,
      filteredOut: scrapedLeads.length - savedLeads.length
    });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: error.message });
  }
};
