import axios from 'axios';
import Lead from '../models/Lead.js';

// Helper: generate mock data (only for non‑Reddit platforms or errors)
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

// ---- Real Reddit API (public, requires User-Agent) ----
const searchReddit = async (query, searchType, count) => {
  // Use Reddit's search endpoint
  let url = 'https://www.reddit.com/search.json';
  const params = {
    q: query,
    limit: Math.min(count, 25),
    sort: 'relevance'
  };

  // If searchType is 'url', we treat the query as a URL and search for it
  // (Reddit search works fine with URL strings)

  const response = await axios.get(url, {
    params,
    headers: {
      'User-Agent': 'LeadConnect/1.0 (https://leadconnect.app)'
    },
    timeout: 10000
  });

  const children = response.data.data?.children || [];
  return children.map(child => {
    const data = child.data;
    return {
      name: data.author || '[deleted]',
      platform: 'reddit',
      email: '',
      phone: '',
      website: `https://reddit.com${data.permalink}`,
      followers: data.score || 0,
      rating: data.upvote_ratio || 0,
      sourceUrl: `https://reddit.com${data.permalink}`,
      verified: false,
      snippet: data.title || data.selftext || ''
    };
  });
};

// ---- Main search dispatcher ----
export const socialSearch = async (req, res) => {
  try {
    const { platform, searchType, query, count = 10 } = req.body;
    console.log('📨 Incoming search:', { platform, searchType, query, count });

    if (!platform || !query) {
      return res.status(400).json({ error: 'Platform and query required' });
    }

    let results = [];
    let usedMock = false;

    // Reddit – real data
    if (platform === 'reddit') {
      try {
        results = await searchReddit(query, searchType, count);
        console.log(`✅ Reddit returned ${results.length} real posts`);
      } catch (err) {
        console.error('❌ Reddit API error:', err.message);
        // Fallback to mock data only if the API call fails
        results = generateMockResults(platform, query, count);
        usedMock = true;
      }
    } else {
      // For other platforms, still use mock (can be replaced with paid APIs later)
      results = generateMockResults(platform, query, count);
      usedMock = true;
    }

    res.json({ results, mock: usedMock });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ---- Save leads to database (unchanged) ----
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
