// backend/routes/leads.js
import express from 'express';
import Lead from '../models/Lead.js';

const router = express.Router();

// ✅ GET all leads
router.get('/', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ SAVE leads - YEH ROUTE HONA CHAHIYE
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;
    
    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads provided' });
    }

    const saved = [];
    
    for (const lead of leads) {
      // Duplicate check
      const exists = await Lead.findOne({ 
        $or: [{ email: lead.email }, { phone: lead.phone }] 
      });
      
      if (!exists) {
        const newLead = new Lead({
          name: lead.name || 'Unknown',
          email: lead.email || '',
          phone: lead.phone || '',
          address: lead.address || '',
          company: lead.company || '',
          website: lead.website || '',
          source: lead.source || 'social',
          platform: lead.platform || '',
          rating: lead.rating || 0,
          verified: lead.verified || false,
          status: lead.status || 'new'
        });
        await newLead.save();
        saved.push(newLead);
      }
    }

    res.json({ success: true, saved: saved.length, savedLeads: saved });
  } catch (err) {
    console.error('Bulk save error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
