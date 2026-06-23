// backend/routes/email.js
import express from 'express';
import {
  extractEmails,
  bulkExtractEmails,
  saveExtractedLeads,
  bulkSendEmail,
  extractEmailsFromLeadIds
} from '../controllers/emailController.js';

const router = express.Router();

// Email extraction
router.post('/extract', extractEmails);
router.post('/bulk-extract', bulkExtractEmails);
router.post('/save', saveExtractedLeads);
router.post('/send-bulk', bulkSendEmail);
router.post('/extract-from-leads', extractEmailsFromLeadIds);

export default router;
