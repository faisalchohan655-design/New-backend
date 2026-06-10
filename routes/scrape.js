import express from 'express';
import { startScraping } from '../controllers/scrapeController.js';

const router = express.Router();
router.post('/scrape', startScraping);

export default router;
