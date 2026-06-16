import axios from 'axios';

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

  try {
    const response = await axios.get(url, { params });
    const localResults = response.data.local_results?.places || [];

    // ✅ Return EMPTY array if no local results – NO MOCK DATA
    return localResults.map(item => ({
      name: item.title || item.name || 'Unknown Business',
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
  } catch (error) {
    console.error('❌ SerpAPI error:', error.message);
    return [];
  }
};

export const socialSearch = async (req, res) => {
  try {
    const { platform, searchType, query, count = 10 } = req.body;
    console.log('📨 Incoming search:', { platform, searchType, query, count });

    if (!platform || !query) {
      return res.status(400).json({ error: 'Platform and query required' });
    }

    const results = await searchWithSerpAPI(query, count);
    console.log(`✅ Returning ${results.length} results`);

    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
};
