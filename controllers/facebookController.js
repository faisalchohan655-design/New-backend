import { fetchFacebookPageData } from '../utils/facebookScraper.js';
import Lead from '../models/Lead.js';

export const scrapeFacebook = async (req, res) => {
  try {
    const { pageUrl, filters } = req.body;
    if (!pageUrl) return res.status(400).json({ error: 'Facebook URL required' });

    const scraped = await fetchFacebookPageData(pageUrl);
    if (!scraped.length) return res.json({ message: 'No leads found' });

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
    res.json({ message: `Saved ${saved.length} Facebook leads`, leads: saved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
