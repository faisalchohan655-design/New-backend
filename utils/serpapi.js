import axios from 'axios';

export const scrapeGoogleMaps = async (keyword, city, count, apiKey) => {
  const query = `${keyword} ${city}`;
  let all = [];
  let start = 0;
  const limit = Math.min(count, 50);
  while (all.length < limit) {
    const res = await axios.get('https://serpapi.com/search', {
      params: { engine: 'google_maps', q: query, type: 'search', api_key: apiKey, start }
    });
    const local = res.data?.local_results || [];
    if (!local.length) break;
    const mapped = local.map(p => ({
      name: p.title || '',
      phone: p.phone || '',
      email: '',
      website: p.website || '',
      address: p.address || '',
      rating: p.rating || 0,
      placeId: p.place_id || `${p.title}-${p.address}`
    }));
    all.push(...mapped);
    start += 20;
    if (local.length < 20) break;
  }
  return all.slice(0, limit);
};
