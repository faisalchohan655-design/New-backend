// backend/routes/social.js
import express from 'express';
import { searchSocial, saveSocialLeads } from '../controllers/socialController.js';

const router = express.Router();

// ✅ Search social media
router.post('/search', searchSocial);

// ✅ Save leads
router.post('/save', saveSocialLeads);

export default router;
