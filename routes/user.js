import express from 'express';
import { getSettings, updateSettings, signup, login, getMe } from '../controllers/userController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', auth, getMe);
router.get('/settings', auth, getSettings);
router.put('/settings', auth, updateSettings);

export default router;
