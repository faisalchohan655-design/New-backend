import express from 'express';
import { getSettings, updateSettings } from '../controllers/userController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/settings', auth, getSettings);
router.put('/settings', auth, updateSettings);

export default router;
