import express from 'express';
import { getAllReplies, getRepliesByLead, createReply, markAsRead } from '../controllers/replyController.js';

const router = express.Router();

router.get('/', getAllReplies);
router.get('/lead/:leadId', getRepliesByLead);
router.post('/', createReply);
router.put('/:id/read', markAsRead);

export default router;
