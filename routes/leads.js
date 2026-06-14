import express from 'express';
import { getAllLeads, deleteLead } from '../controllers/leadsController.js';

const router = express.Router();

router.get('/', getAllLeads);
router.delete('/:id', deleteLead);

// Update lead (status, contactPerson, etc.)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const Lead = (await import('../models/Lead.js')).default;
    const updated = await Lead.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Lead not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
