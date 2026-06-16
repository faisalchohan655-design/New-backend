import express from 'express';
import { socialSearch } from '../controllers/socialController.js';

const router = express.Router();
router.post('/search', socialSearch);

export default router;
