import axios from 'axios';
import Lead from '../models/Lead.js';

// Helper: generate mock data (only when API key is missing or API fails)
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

// Real SociaVault API call
const fetchFromSociaVault = async (platform, searchType, query, count) => {
  const apiKey = process.env.SOCIAVAULT_API_KEY;
  if (!apiKey) {
    console.warn('SOCIAVAULT_API_KEY is missing. Using mock data.');
    return null;
  }

  // SociaVault API endpoint (adjust based on their actual documentation)
  let endpoint = '';
  let params = {};

  if (searchType === 'url') {
    endpoint = `/v1/${platform}/info`;
    params = { url: query };
  } else {
    endpoint = `/v1/${platform}/search`;
    params = { q: query, limit: count };
  }

  const url = `https://api.sociavault.io${endpoint}`;
  console.log(`Calling SociaVault: ${url}`, params);

  try {
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      params
    });

    // SociaVault response may have different structure. Adjust mapping as needed.
    const items = response.data.results || response.data.data || response.data.items || [];
    if (!items.length) {
      console.log('No results from SociaVault');
      return [];
    }

    // Transform to our unified format
    return items.slice(0, count).map(item => ({
      name: item.name || item.title || item.username || '',
      platform: platform,
      email: item.email || item.contact_email || '',
      phone: item.phone || item.contact_phone || '',
      website: item.website || item.url || '',
      followers: item.followers || item.fan_count || 0,
      rating: item.rating || item.stars || 0,
      sourceUrl: item.url || item.profile_url || '',
      verified: item.verified || false
    }));
  } catch (error) {
    console.error('SociaVault API error:', error.response?.data || error.message);
    return null; // signal to fallback to mock
  }
};

export const socialSearch = async (req, res) => {
  try {
    const { platform, searchType, query, count = 10 } = req.body;
    if (!platform || !query) {
      return res.status(400).json({ error: 'Platform and query required' });
    }

    let results = [];
    let usedMock = false;

    // Try real API
    const realResults = await fetchFromSociaVault(platform, searchType, query, count);
    if (realResults && realResults.length) {
      results = realResults;
    } else if (realResults === null) {
      // API call failed or key missing → fallback to mock
      results = generateMockResults(platform, query, count);
      usedMock = true;
    } else {
      // No results but API succeeded → empty array (no mock)
      results = [];
    }

    res.json({ results, mock: usedMock });
  } catch (error) {
    console.error('Search error:', error);
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
