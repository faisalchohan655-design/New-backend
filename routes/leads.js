import express from 'express';
import { getAllLeads, deleteLead } from '../controllers/leadsController.js';
import Lead from '../models/Lead.js';

const router = express.Router();

// GET all leads – this will be mounted at /api/leads
router.get('/', getAllLeads);

// DELETE a lead
router.delete('/:id', deleteLead);

// PATCH update lead (for status, contactPerson)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const updated = await Lead.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Lead not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
