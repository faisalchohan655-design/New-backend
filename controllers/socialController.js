// backend/controllers/socialController.js
import axios from 'axios';
import Lead from '../models/Lead.js';

// ============================================
// ✅ SEARCH SOCIAL MEDIA (FIXED)
// ============================================
export const searchSocial = async (req, res) => {
  try {
    const { 
      query, 
      platform, 
      location = 'New York, New York, United States',
      gl = 'us',
      hl = 'en'
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`🔍 Searching ${platform} for: ${query} in ${location}`);

    // SerpApi params
    const params = {
      api_key: process.env.SERPAPI_KEY,
      engine: platform === 'google_maps' ? 'google_maps' : 'google',
      q: query,
      location: location,
      gl: gl,
      hl: hl,
      num: 20
    };

    // Google Maps specific
    if (platform === 'google_maps') {
      params.ll = '@40.7455096,-74.0083012,15.1z';
      params.type = 'search';
    }

    // LinkedIn specific
    if (platform === 'linkedin') {
      params.engine = 'google';
      params.q = `site:linkedin.com ${query}`;
    }

    // Facebook specific
    if (platform === 'facebook') {
      params.engine = 'google';
      params.q = `site:facebook.com ${query}`;
    }

    // Instagram specific
    if (platform === 'instagram') {
      params.engine = 'google';
      params.q = `site:instagram.com ${query}`;
    }

    // Reddit specific
    if (platform === 'reddit') {
      params.engine = 'google';
      params.q = `site:reddit.com ${query}`;
    }

    // TikTok specific
    if (platform === 'tiktok') {
      params.engine = 'google';
      params.q = `site:tiktok.com ${query}`;
    }

    console.log('📡 Sending request to SerpApi...');

    // Call SerpApi
    const response = await axios.get('https://serpapi.com/search.json', { params });
    const data = response.data;

    console.log('✅ SerpApi response received');

    // ============================================
    // 🔥 FILTER FAKE RESULTS
    // ============================================
    let results = [];

    // Google Maps results
    if (platform === 'google_maps' && data.local_results?.places) {
      results = data.local_results.places
        .filter(place => {
          // ✅ Filter fake/empty results
          const hasValidName = place.title && place.title.length > 2;
          const hasValidAddress = place.address && place.address.length > 5;
          const hasValidRating = place.rating !== undefined && place.rating > 0;
          const hasValidReviews = place.reviews !== undefined && place.reviews > 0;
          const hasValidPhone = place.phone_number && place.phone_number.length > 5;
          
          // ✅ Filter out fake/bot results
          const notFakeName = !place.title.toLowerCase().includes('test');
          const notFakeAddress = !place.address.toLowerCase().includes('test');
          const notFakePhone = !place.phone_number?.toLowerCase().includes('000');
          
          return hasValidName && hasValidAddress && 
                 (hasValidPhone || hasValidRating) &&
                 notFakeName && notFakeAddress && notFakePhone;
        })
        .map(place => ({
          name: place.title,
          address: place.address,
          phone: place.phone_number || '',
          rating: place.rating || 0,
          reviews: place.reviews || 0,
          website: place.website || '',
          location: {
            lat: place.gps_coordinates?.latitude || '',
            lng: place.gps_coordinates?.longitude || ''
          },
          placeId: place.place_id || '',
          source: 'google_maps',
          verified: place.rating > 3.5 && place.reviews > 10
        }));
    }

    // Google search results for social platforms
    else if (data.organic_results) {
      results = data.organic_results
        .filter(result => {
          // ✅ Filter fake/empty results
          const hasValidTitle = result.title && result.title.length > 3;
          const hasValidSnippet = result.snippet && result.snippet.length > 5;
          const hasValidLink = result.link && result.link.includes(platform);
          const notFake = !result.title.toLowerCase().includes('test') &&
                         !result.snippet?.toLowerCase().includes('test');
          
          return hasValidTitle && hasValidSnippet && hasValidLink && notFake;
        })
        .map(result => {
          // Try to extract email from snippet
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
          const emailMatch = result.snippet?.match(emailRegex);
          
          // Try to extract phone
          const phoneRegex = /(\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/;
          const phoneMatch = result.snippet?.match(phoneRegex);
          
          return {
            name: result.title.split('|')[0].trim(),
            address: result.snippet || '',
            phone: phoneMatch ? phoneMatch[0] : '',
            email: emailMatch ? emailMatch[0] : '',
            website: result.link || '',
            source: platform,
            platform: platform,
            verified: emailMatch !== null || phoneMatch !== null,
            link: result.link
          };
        });
    }

    console.log(`📊 Found ${results.length} real results (filtered fake ones)`);

    res.json({
      success: true,
      count: results.length,
      results: results,
      platform: platform,
      location: location,
      totalFound: data.search_information?.total_results || 0
    });

  } catch (error) {
    console.error('❌ Social search error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
};

// ============================================
// ✅ SAVE LEADS FROM SOCIAL SEARCH
// ============================================
export const saveSocialLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    
    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads provided' });
    }

    const saved = [];
    const skipped = [];

    for (const lead of leads) {
      try {
        // Check if email exists
        const existing = await Lead.findOne({ 
          $or: [
            { email: lead.email },
            { phone: lead.phone }
          ]
        });

        if (existing) {
          skipped.push({ email: lead.email, reason: 'Already exists' });
          continue;
        }

        // Create new lead
        const newLead = new Lead({
          name: lead.name || 'Unknown',
          email: lead.email || '',
          phone: lead.phone || '',
          address: lead.address || '',
          company: lead.company || '',
          website: lead.website || '',
          source: lead.source || 'social',
          status: 'new',
          createdAt: new Date()
        });

        await newLead.save();
        saved.push(newLead);

      } catch (err) {
        console.error('Error saving lead:', err);
      }
    }

    res.json({
      success: true,
      saved: saved.length,
      skipped: skipped.length,
      skippedDetails: skipped
    });

  } catch (error) {
    console.error('Save social leads error:', error);
    res.status(500).json({ error: error.message });
  }
};
