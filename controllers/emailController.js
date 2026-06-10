import Lead from '../models/Lead.js';
import nodemailer from 'nodemailer';

// Temporary test version – returns sample emails to verify route works
export const extractEmails = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    // Return dummy data with correct structure
    const leads = [
      { email: `contact@${new URL(url).hostname}`, verified: true, phone: '', source: url },
      { email: `info@${new URL(url).hostname}`, verified: false, phone: '', source: url }
    ];
    res.json({ success: true, count: leads.length, leads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const bulkExtractEmails = async (req, res) => {
  const { urls } = req.body;
  if (!urls || !urls.length) return res.status(400).json({ error: 'URLs required' });
  const leads = urls.map(url => ({
    email: `contact@${new URL(url).hostname}`,
    verified: true,
    phone: '',
    source: url
  }));
  res.json({ success: true, count: leads.length, leads });
};

export const saveExtractedLeads = async (req, res) => {
  const { leads } = req.body;
  const saved = [];
  for (const lead of leads) {
    const existing = await Lead.findOne({ email: lead.email });
    if (!existing) {
      const newLead = new Lead({
        name: lead.email.split('@')[0],
        email: lead.email,
        phone: lead.phone || '',
        website: lead.source,
        address: lead.source,
        placeId: `email_${lead.email}_${Date.now()}`,
        rating: lead.verified ? 3 : 0,
        createdAt: new Date()
      });
      await newLead.save();
      saved.push(newLead);
    }
  }
  res.json({ success: true, saved: saved.length });
};

export const bulkSendEmail = async (req, res) => {
  const { recipients, subject, message } = req.body;
  if (!recipients || recipients.length === 0) return res.status(400).json({ error: 'No recipients' });
  if (recipients.length > 50) return res.status(400).json({ error: 'Max 50 recipients per batch' });
  // For testing, just log and return success
  console.log('Would send email to:', recipients);
  res.json({ success: true, sent: recipients.length });
};
