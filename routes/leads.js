import express from 'express';
import { getAllLeads, deleteLead } from '../controllers/leadsController.js';

const router = express.Router();

router.get('/leads', getAllLeads);      // ✅ Now responds to /api/leads
router.delete('/leads/:id', deleteLead);

export default router;
