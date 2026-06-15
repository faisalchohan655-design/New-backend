import axios from 'axios';
import Lead from '../models/Lead.js';

// Helper for mock data (used only when API key is missing)
const generateMockResults = (platform, query, count) => {
  const results = [];
  for (let i = 1; i <= Math.min(count, 10); i++) {
    results.push({
      name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Business ${i}`,
      platform: platform,
      email: `contact${i}@${query?.replace(/\s/g, '') || 'example'}.com`,
      phone: `+92300100000${i}`,
      website: `https://www.${query?.replace(/\s/g, '') || 'example'}.com/${i}`,
      followers: Math.floor(Math.random() * 10000),
      rating: (Math.random() * 5).toFixed(1),
      sourceUrl: `https://${platform}.com/profile/${i}`,
      verified: i % 2 === 0
    });
  }
  return results;
};

// Real SociaVault search by keyword or URL
const searchWithSociaVault = async (platform, searchType, query, count) => {
  const apiKey = process.env.SOCIAVAULT_API_KEY;
  if (!apiKey) return null;

  // SociaVault endpoints (adjust based on their API docs)
  // For demo, we'll use a generic search endpoint
  let endpoint = '';
  let params = {};

  if (searchType === 'url') {
    endpoint = `/${platform}/info`;
    params = { url: query };
  } else {
    endpoint = `/${platform}/search`;
    params = { q: query, limit: count };
  }

  const response = await axios.get(`https://api.sociavault.io/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    params
  });

  // Transform SociaVault response to our unified format
  const items = response.data.results || response.data.data || [];
  return items.slice(0, count).map(item => ({
    name: item.name || item.title || item.username || '',
    platform: platform,
    email: item.email || '',
    phone: item.phone || '',
    website: item.website || item.url || '',
    followers: item.followers || item.fan_count || 0,
    rating: item.rating || item.stars || 0,
    sourceUrl: item.url || item.profile_url || '',
    verified: item.verified || false
  }));
};

export const socialSearch = async (req, res) => {
  try {
    const { platform, searchType, query, count = 10 } = req.body;
    if (!platform || !query) {
      return res.status(400).json({ error: 'Platform and query required' });
    }

    let results = [];
    let usedMock = false;

    // Try real SociaVault API
    try {
      results = await searchWithSociaVault(platform, searchType, query, count);
      if (results && results.length) {
        return res.json({ results, mock: false });
      }
    } catch (err) {
      console.error('SociaVault error:', err.message);
    }

    // Fallback to mock data
    results = generateMockResults(platform, query, count);
    usedMock = true;
    return res.json({ results, mock: usedMock });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const saveSocialLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads to save' });
    }

    const saved = [];
    for (const lead of leads) {
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
