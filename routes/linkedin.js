import express from 'express';
import { scrapeLinkedIn } from '../controllers/linkedinController.js';

const router = express.Router();
router.post('/linkedin', scrapeLinkedIn);

export default router;
