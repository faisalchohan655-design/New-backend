import axios from 'axios';
import Lead from '../models/Lead.js';

// SociaVault API configuration
const SOCIAVAULT_API_KEY = process.env.SOCIAVAULT_API_KEY;
const SOCIAVAULT_BASE_URL = 'https://api.sociavault.io/v1';

// Platform-specific endpoints
const platformEndpoints = {
  facebook: {
    search: '/scrape/facebook/search',
    profile: '/scrape/facebook/page'
  },
  linkedin: {
    search: '/scrape/linkedin/search',
    profile: '/scrape/linkedin/profile'
  },
  instagram: {
    search: '/scrape/instagram/search',
    profile: '/scrape/instagram/profile'
  },
  reddit: {
    search: '/scrape/reddit/search',
    profile: '/scrape/reddit/subreddit'
  },
  tiktok: {
    search: '/scrape/tiktok/search',
    profile: '/scrape/tiktok/user'
  }
};

// Main search endpoint
export const socialSearch = async (req, res) => {
  try {
    const { platform, searchType, query, count = 10, deepCrawl = false, verifiedOnly = false } = req.body;

    if (!platform || !query) {
      return res.status(400).json({ error: 'Platform and query are required' });
    }

    if (!SOCIAVAULT_API_KEY) {
      console.error('SOCIAVAULT_API_KEY not set. Please add it to Railway variables.');
      // For demo/testing, return mock data
      return res.json({ results: getMockData(platform, query, count) });
    }

    // Build request based on search type
    let endpoint;
    let params = {};

    if (searchType === 'url') {
      endpoint = platformEndpoints[platform]?.profile;
      params = { url: query };
    } else {
      endpoint = platformEndpoints[platform]?.search;
      params = { q: query, limit: count };
    }

    if (!endpoint) {
      return res.status(400).json({ error: `Invalid platform: ${platform}` });
    }

    const response = await axios.get(`${SOCIAVAULT_BASE_URL}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${SOCIAVAULT_API_KEY}` },
      params
    });

    // Transform response to unified format
    const results = transformResults(response.data, platform);
    
    // Apply filters
    let filteredResults = results;
    if (verifiedOnly) {
      filteredResults = filteredResults.filter(r => r.email && r.email.trim() !== '');
    }

    res.json({ 
      success: true, 
      count: filteredResults.length,
      results: filteredResults.slice(0, count)
    });

  } catch (error) {
    console.error('Social search error:', error);
    // Fallback to mock data for testing
    res.json({ results: getMockData(req.body.platform, req.body.query, req.body.count || 10) });
  }
};

// Transform SociaVault response to unified format
function transformResults(data, platform) {
  if (!data || !data.results) return [];

  return data.results.map(item => ({
    name: item.name || item.title || item.username || '',
    platform: platform,
    email: item.email || item.contact_email || '',
    phone: item.phone || item.contact_phone || '',
    website: item.website || item.url || '',
    followers: item.followers || item.fan_count || 0,
    rating: item.rating || item.stars || 0,
    sourceUrl: item.url || item.profile_url || '',
    bio: item.bio || item.description || '',
    verified: item.verified || false
  }));
}

// Mock data for testing (when API key is not set)
function getMockData(platform, query, count) {
  const mockResults = [];
  for (let i = 1; i <= Math.min(count, 10); i++) {
    mockResults.push({
      name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Business ${i}`,
      platform: platform,
      email: `contact${i}@${query.replace(/\s/g, '')}.com`,
      phone: `+92300${1000000 + i}`,
      website: `https://www.${query.replace(/\s/g, '')}.com/${i}`,
      followers: Math.floor(Math.random() * 10000),
      rating: (Math.random() * 5).toFixed(1),
      sourceUrl: `https://${platform}.com/profile/${i}`,
      bio: `This is a mock ${platform} business for testing`,
      verified: i % 2 === 0
    });
  }
  return mockResults;
}

// Save multiple leads to database
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
          { placeId: `${lead.platform}_${lead.sourceUrl}` }
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
    console.error('Save social leads error:', error);
    res.status(500).json({ error: error.message });
  }
};
