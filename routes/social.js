import express from 'express';
import { socialSearch, saveSocialLeads } from '../controllers/socialController.js';

const router = express.Router();

// Search social media platforms
router.post('/search', socialSearch);

// Save extracted leads to database
router.post('/save-leads', saveSocialLeads);

export default router;
