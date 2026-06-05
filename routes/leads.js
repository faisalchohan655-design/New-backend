import express from 'express';
import { getAllLeads } from '../controllers/leadsController.js';

const router = express.Router();
router.get('/leads', getAllLeads);
export default router;
