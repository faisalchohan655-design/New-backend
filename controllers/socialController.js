const searchWithSerpAPI = async (query, count) => {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [];

  const url = 'https://serpapi.com/search';
  const params = {
    q: query,
    api_key: apiKey,
    num: Math.min(count, 10),
    engine: 'google'
  };

  const response = await axios.get(url, { params });
  const localResults = response.data.local_results?.places || [];

  // ✅ ONLY return real results – NO mock data
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
};
