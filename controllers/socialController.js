import axios from 'axios';
import Lead from '../models/Lead.js';

// ---- SerpAPI Google Search ----
const searchWithSerpAPI = async (query, count) => {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    console.error('❌ SERPAPI_KEY missing');
    return [];
  }

  const url = 'https://serpapi.com/search';
  const params = {
    q: query,
    api_key: apiKey,
    num: Math.min(count, 10),
    engine: 'google'
  };

  console.log('🌐 Calling SerpAPI with params:', params);

  const response = await axios.get(url, { params });
  console.log('✅ SerpAPI response status:', response.status);

  const localResults = response.data.local_results?.places || [];
  const organicResults = response.data.organic_results || [];

  console.log(`📊 SerpAPI returned: ${localResults.length} local, ${organicResults.length} organic`);

  const items = localResults.length > 0 ? localResults : organicResults;

  return items.slice(0, count).map(item => ({
    name: item.title || item.name || '',
    platform: 'web',
    email: '',
    phone: '',
    website: item.website || item.link || '',
    sourceUrl: item.link || item.website || '',
    followers: 0,
    rating: item.rating || 0,
    verified: false,
    snippet: item.snippet || item.description || ''
  }));
};

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
      sourceUrl: `https://www.${query?.replace(/\s/g, '') || 'example'}.com/${i}`,
      followers: Math.floor(Math.random() * 10000),
      rating: (Math.random() * 5).toFixed(1),
      verified: i % 2 === 0
    });
  }
  return results;
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
      console.log(`✅ Returning ${results.length} real results`);
      if (results.length === 0) {
        console.warn('⚠️ No results from SerpAPI, falling back to mock');
        results = generateMockResults(platform, query, count);
        usedMock = true;
      }
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
    console.log('📦 [social] Received leads:', leads?.length || 0);

    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads to save' });
    }

    const saved = [];
    const errors = [];

    for (const lead of leads) {
      try {
        if (!lead.name && !lead.website && !lead.sourceUrl) {
          errors.push({ lead, error: 'No name, website, or sourceUrl' });
          continue;
        }

        const uniqueId = lead.website || lead.sourceUrl || lead.name || `lead_${Date.now()}`;
        const placeId = `${lead.platform || 'social'}_${uniqueId}`;

        const existing = await Lead.findOne({
          $or: [
            { placeId: placeId },
            { website: lead.website },
            { email: lead.email }
          ]
        });

        if (!existing) {
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
          console.log(`✅ Saved social lead: ${newLead.name} (${newLead.placeId})`);
        } else {
          console.log(`⏭️ Social lead already exists: ${lead.name || lead.website}`);
        }
      } catch (err) {
        console.error('❌ Error saving social lead:', err.message);
        errors.push({ lead, error: err.message });
      }
    }

    console.log(`📊 Social summary: ${saved.length} saved, ${errors.length} errors`);

    res.json({
      success: true,
      saved: saved.length,
      total: leads.length,
      errors: errors.length > 0 ? errors : undefined,
      savedLeads: saved
    });
  } catch (error) {
    console.error('❌ SaveSocialLeads error:', error);
    res.status(500).json({ error: error.message });
  }
};
