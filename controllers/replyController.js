import Reply from '../models/Reply.js';
import Lead from '../models/Lead.js';

// Get all replies
export const getAllReplies = async (req, res) => {
  try {
    const replies = await Reply.find().sort({ createdAt: -1 }).limit(50);
    res.json(replies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get replies for a specific lead
export const getRepliesByLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const replies = await Reply.find({ leadId }).sort({ createdAt: -1 });
    res.json(replies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new reply (webhook)
export const createReply = async (req, res) => {
  try {
    const { from, to, subject, message, html, leadId } = req.body;
    const reply = new Reply({ from, to, subject, message, html, leadId });
    await reply.save();
    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark reply as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const reply = await Reply.findByIdAndUpdate(id, { read: true }, { new: true });
    res.json(reply);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
