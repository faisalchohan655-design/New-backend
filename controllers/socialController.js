import axios from 'axios';
import Lead from '../models/Lead.js';

// Helper: generate mock data (fallback only)
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

// ---- SerpAPI Google Search ----
const searchWithSerpAPI = async (query, count) => {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error('SERPAPI_KEY missing');

  const url = 'https://serpapi.com/search';
  const params = {
    q: query,
    api_key: apiKey,
    num: Math.min(count, 10),
    engine: 'google'
  };

  const response = await axios.get(url, { params });
  const organicResults = response.data.organic_results || [];
  return organicResults.map(item => ({
    name: item.title || '',
    platform: 'web',
    email: '',
    phone: '',
    website: item.link || '',
    followers: 0,
    rating: 0,
    sourceUrl: item.link || '',
    verified: false,
    snippet: item.snippet || ''
  }));
};

// ---- SOCIAL SEARCH ----
export const socialSearch = async (req, res) => {
  try {
    const { platform, searchType, query, count = 10 } = req.body;
    console.log('📨 Incoming search:', { platform, searchType, query, count });

    if (!platform || !query) {
      return res.status(400).json({ error: 'Platform and query required' });
    }

    let results = [];
    let usedMock = false;

    try {
      results = await searchWithSerpAPI(query, count);
      console.log(`✅ SerpAPI returned ${results.length} results`);
    } catch (err) {
      console.error('❌ SerpAPI error:', err.message);
      results = generateMockResults(platform, query, count);
      usedMock = true;
    }

    res.json({ results, mock: usedMock });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ---- SAVE SOCIAL LEADS ----
export const saveSocialLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    console.log('📦 Received leads to save:', leads?.length || 0);

    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads to save' });
    }

    const saved = [];
    const errors = [];

    for (const lead of leads) {
      try {
        if (!lead.name && !lead.website) {
          errors.push({ lead, error: 'No name or website' });
          continue;
        }

        const placeId = `${lead.platform || 'social'}_${lead.website || lead.sourceUrl || Date.now()}`;

        const existing = await Lead.findOne({
          $or: [
            { website: lead.website },
            { email: lead.email }
          ]
        });

        if (existing) {
          console.log(`⏭️ Lead already exists: ${lead.website || lead.email}`);
          continue;
        }

        const newLead = new Lead({
          name: lead.name || 'Unknown Business',
          phone: lead.phone || '',
          email: lead.email || '',
          website: lead.website || '',
          address: lead.address || '',
          rating: parseFloat(lead.rating) || 0,
          placeId: placeId,
          source: lead.platform || 'social',
          status: 'Untouched',
          createdAt: new Date()
        });

        await newLead.save();
        saved.push(newLead);
        console.log(`✅ Saved lead: ${newLead.name} (${newLead.website})`);
      } catch (err) {
        console.error('❌ Error saving individual lead:', err.message);
        errors.push({ lead, error: err.message });
      }
    }

    console.log(`📊 Summary: ${saved.length} saved, ${errors.length} errors`);

    res.json({
      success: true,
      saved: saved.length,
      total: leads.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('❌ SaveSocialLeads error:', error);
    res.status(500).json({ error: error.message });
  }
};
