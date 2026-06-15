import axios from 'axios';
import Lead from '../models/Lead.js';

const SOCIAVAULT_API_KEY = process.env.SOCIAVAULT_API_KEY;
const SOCIAVAULT_BASE_URL = 'https://api.sociavault.io/v1';

// Search social media
export const socialSearch = async (req, res) => {
  try {
    const { platform, searchType, query, count = 10, deepCrawl, verifiedOnly } = req.body;
    if (!platform || !query) return res.status(400).json({ error: 'Platform and query required' });

    if (!SOCIAVAULT_API_KEY) {
      // Return mock data for testing
      const mockResults = [];
      for (let i = 1; i <= Math.min(count, 10); i++) {
        mockResults.push({
          name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Business ${i}`,
          platform: platform,
          email: `contact${i}@${query.replace(/\s/g, '')}.com`,
          phone: `+92300100000${i}`,
          website: `https://www.${query.replace(/\s/g, '')}.com/${i}`,
          followers: Math.floor(Math.random() * 10000),
          rating: (Math.random() * 5).toFixed(1),
          sourceUrl: `https://${platform}.com/profile/${i}`,
          verified: i % 2 === 0
        });
      }
      return res.json({ results: mockResults, mock: true });
    }

    // Real SociaVault call – implement according to their API docs
    // For now, return mock data with a warning
    console.warn('SociaVault integration not fully implemented yet. Using mock data.');
    return res.json({ results: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Save leads to database
export const saveSocialLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads to save' });
    }

    const saved = [];
    for (const lead of leads) {
      // Check if lead already exists by email or unique identifier
      const existing = await Lead.findOne({ 
        $or: [
          { email: lead.email },
          { placeId: `${lead.platform}_${lead.sourceUrl || lead.name}` }
        ] 
      });
      if (!existing) {
        const newLead = new Lead({
          name: lead.name,
          phone: lead.phone || '',
          email: lead.email || '',
          website: lead.website || '',
          address: lead.address || '',
          rating: parseFloat(lead.rating) || 0,
          placeId: `${lead.platform}_${lead.sourceUrl || Date.now()}`,
          source: lead.platform,
          status: 'Untouched',
          createdAt: new Date()
        });
        await newLead.save();
        saved.push(newLead);
      }
    }
    res.json({ success: true, saved: saved.length, total: leads.length });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: error.message });
  }
};
