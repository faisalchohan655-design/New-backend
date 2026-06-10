import express from 'express';
import { extractEmails, bulkExtractEmails, saveExtractedLeads, bulkSendEmail } from '../controllers/emailController.js';

const router = express.Router();

router.post('/extract', extractEmails);
router.post('/bulk-extract', bulkExtractEmails);
router.post('/save-leads', saveExtractedLeads);
router.post('/bulk-send', bulkSendEmail);

export default router;
