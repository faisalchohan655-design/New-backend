// backend/routes/leads.js
import express from 'express';
import Lead from '../models/Lead.js';

const router = express.Router();

// GET all leads
router.get('/', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ BULK SAVE - FIXED (200 OK returns data)
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;
    
    console.log('📝 Bulk save:', leads?.length || 0, 'leads');

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'No leads provided' });
    }

    const saved = [];
    const skipped = [];

    for (const lead of leads) {
      try {
        const existing = await Lead.findOne({
          $or: [
            { email: lead.email },
            { phone: lead.phone }
          ]
        });

        if (existing) {
          skipped.push({ email: lead.email, reason: 'Duplicate' });
          continue;
        }

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
      } catch (err) {
        skipped.push({ email: lead.email, reason: err.message });
      }
    }

    console.log(`✅ Saved: ${saved.length}, Skipped: ${skipped.length}`);

    // ✅ YEH IMPORTANT HAI - 200 OK with data
    res.status(200).json({
      success: true,
      saved: saved.length,
      skipped: skipped.length,
      savedLeads: saved,
      skippedDetails: skipped
    });

  } catch (error) {
    console.error('❌ Bulk save error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
