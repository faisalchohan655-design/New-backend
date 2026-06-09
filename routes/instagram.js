import express from 'express';
import { scrapeInstagram } from '../controllers/instagramController.js';

const router = express.Router();
router.post('/instagram', scrapeInstagram);

export default router;
