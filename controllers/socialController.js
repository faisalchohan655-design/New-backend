import Lead from '../models/Lead.js';

// Helper: generate mock data (for testing without API key)
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

// Search endpoint (returns mock data until SociaVault API is integrated)
export const socialSearch = async (req, res) => {
  try {
    const { platform, searchType, query, count = 10 } = req.body;
    if (!platform || !query) {
      return res.status(400).json({ error: 'Platform and query required' });
    }

    // For now, always return mock data
    // Later you can replace with real SociaVault API call
    const results = generateMockResults(platform, query, count);
    res.json({ results, mock: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Save leads to database
export const saveSocialLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads to save' });
    }

    const saved = [];
    for (const lead of leads) {
      // Check if lead already exists (by email or unique ID)
      const existing = await Lead.findOne({ 
        $or: [
          { email: lead.email },
          { placeId: `${lead.platform}_${lead.sourceUrl || lead.name}` }
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
    console.error('Save error:', error);
    res.status(500).json({ error: error.message });
  }
};
