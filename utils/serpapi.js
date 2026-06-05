import axios from 'axios';

export const scrapeGoogleMaps = async (keyword, city, count, apiKey) => {
  const query = `${keyword} ${city}`;
  let allResults = [];
  let start = 0;
  const limit = Math.min(count, 50);

  while (allResults.length < limit) {
    const params = {
      engine: 'google_maps',
      q: query,
      type: 'search',
      api_key: apiKey,
      start: start
    };
    const response = await axios.get('https://serpapi.com/search', { params });
    const localResults = response.data?.local_results || [];
    if (localResults.length === 0) break;

    const mapped = localResults.map(place => ({
      name: place.title || '',
      phone: place.phone || '',
      email: '',
      website: place.website || '',
      address: place.address || '',
      rating: place.rating || 0,
      placeId: place.place_id || `${place.title}-${place.address}`
    }));
    allResults.push(...mapped);
    start += 20;
    if (localResults.length < 20) break;
  }
  return allResults.slice(0, limit);
};
