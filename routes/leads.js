import express from 'express';
import { getAllLeads, deleteLead, saveBulkLeads } from '../controllers/leadsController.js';

const router = express.Router();

router.get('/', getAllLeads);
router.delete('/:id', deleteLead);
router.post('/bulk', saveBulkLeads);

export default router;
