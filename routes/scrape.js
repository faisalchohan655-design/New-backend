import express from 'express';
import axios from 'axios';
import { saveLeads } from '../controllers/leadsController.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { keyword, city, limit = 20, filters } = req.body;
    console.log('Scrape request:', { keyword, city, limit });

    const SERPAPI_KEY = process.env.SERPAPI_KEY;

    if (!SERPAPI_KEY) {
      return res.status(500).json({
        error: 'SERPAPI_KEY missing. Railway > Variables میں لگاؤ'
      });
    }

    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_maps',
        q: `${keyword} in ${city}`,
        api_key: SERPAPI_KEY,
        num: limit
      }
    });

    const results = response.data.local_results || [];

    const leads = results.map(place => ({
      name: place.title || '',
      address: place.address || '',
      phone: place.phone || '',
      website: place.website || '',
      rating: place.rating || 0,
      placeId: place.place_id || null,
      city: city || '',
      interest: keyword || '',
      source: 'Google Maps',
      snippet: place.snippet || ''
    }));

    await saveLeads(leads); // MongoDB میں save

    res.json({
      success: true,
      total: leads.length,
      leads
    });

  } catch (error) {
    console.error('Scrape error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
