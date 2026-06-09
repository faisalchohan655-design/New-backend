import express from 'express';
import { getAllLeads, deleteLead } from '../controllers/leadsController.js';

const router = express.Router();

router.get('/', getAllLeads);
router.delete('/:id', deleteLead);

export default router;
