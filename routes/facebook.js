import express from 'express';
import { scrapeFacebook } from '../controllers/facebookController.js';
const router = express.Router();
router.post('/facebook', scrapeFacebook);
export default router;
