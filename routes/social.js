import express from 'express';
import { socialSearch, saveSocialLeads } from '../controllers/socialController.js';

const router = express.Router();

router.post('/search', socialSearch);
router.post('/save-leads', saveSocialLeads);

export default router;
