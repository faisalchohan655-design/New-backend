import express from 'express';
import axios from 'axios';
import Lead from '../models/Lead.js';

const router = express.Router();

// GET /api/facebook/buyers - Facebook buyers nikalne ke liye
router.get('/facebook/buyers', async (req, res) => {
  try {
    const keywords = ['AC chahiye', 'laptop chahiye', 'mobile chahiye'];
    const cities = ['Karachi', 'Lahore', 'Islamabad'];
    const allLeads = [];

    for (const keyword of keywords) {
      for (const city of cities) {
        const searchQuery = `${keyword} ${city}`;
        
        const response = await axios.get('https://serpapi.com/search.json', {
          params: {
            engine: 'google',
            q: searchQuery,
            api_key: process.env.SERPAPI_KEY,
            num: 10
          }
        });

        const results = response.data.organic_results || [];
        
        for (const result of results) {
          if (result.link && result.link.includes('facebook.com')) {
            const lead = new Lead({
              name: result.title || 'Facebook Buyer',
              phone: 'N/A',
              email: 'N/A',
              source: 'Facebook',
              city: city,
              interest: keyword,
              postUrl: result.link,
              snippet: result.snippet || ''
            });
            
            await lead.save();
            allLeads.push(lead);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `${allLeads.length} Facebook buyers saved!`,
      leads: allLeads
    });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({success: false, error: error.message});
  }
});

export default router;
