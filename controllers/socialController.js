import axios from 'axios';
import Lead from '../models/Lead.js';

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

export const socialSearch = async (req, res) => {
  try {
    const { platform, searchType, query, count = 10 } = req.body;
    console.log('📨 Incoming search:', { platform, searchType, query, count });

    if (!platform || !query) {
      return res.status(400).json({ error: 'Platform and query required' });
    }

    const apiKey = process.env.SOCIAVAULT_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ SOCIAVAULT_API_KEY missing – using mock data');
      return res.json({ results: generateMockResults(platform, query, count), mock: true });
    }

    // ✅ Build correct URL
    let path;
    let params = {};

    if (searchType === 'url') {
      path = `/${platform}/profile`;
      params = { url: query };
    } else {
      path = `/${platform}/search`;
      params = { q: query, limit: count };
    }

    const url = `https://api.sociavault.io/v1${path}`;
    console.log(`🌐 Calling SociaVault: ${url}`, params);

    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      params,
      timeout: 15000
    });

    const items = response.data.results || response.data.data || [];
    if (!items.length) {
      console.log('No results from SociaVault');
      return res.json({ results: [], mock: false });
    }

    const results = items.slice(0, count).map(item => ({
      name: item.name || item.title || item.username || '',
      platform,
      email: item.email || '',
      phone: item.phone || '',
      website: item.website || item.url || '',
      followers: item.followers || 0,
      rating: item.rating || 0,
      sourceUrl: item.url || '',
      verified: item.verified || false
    }));

    res.json({ results, mock: false });
  } catch (error) {
    console.error('❌ SociaVault API error:', error.response?.data || error.message);
    // Fallback to mock data
    res.json({ results: generateMockResults(req.body.platform, req.body.query, req.body.count || 10), mock: true });
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
      const existing = await Lead.findOne({ email: lead.email });
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
