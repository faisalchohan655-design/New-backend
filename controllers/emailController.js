import { extractEmailsFromUrl, verifyEmail } from '../utils/emailExtractor.js';
import nodemailer from 'nodemailer';
import Lead from '../models/Lead.js';

export const extractEmails = async (req, res) => {
  try {
    const { url, deep = false, maxPages = 10 } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    const leads = await extractEmailsFromUrl(url, deep, maxPages);
    res.json({ success: true, count: leads.length, leads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const bulkExtractEmails = async (req, res) => {
  try {
    const { urls, deep = false, maxPagesPerUrl = 5 } = req.body;
    if (!urls || !urls.length) return res.status(400).json({ error: 'URLs required' });
    let allLeads = [];
    for (const url of urls.slice(0, 20)) {
      const leads = await extractEmailsFromUrl(url, deep, maxPagesPerUrl);
      allLeads.push(...leads);
    }
    const unique = new Map();
    for (const lead of allLeads) unique.set(lead.email, lead);
    res.json({ success: true, count: unique.size, leads: Array.from(unique.values()) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const saveExtractedLeads = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const bulkSendEmail = async (req, res) => {
  try {
    const { recipients, subject, message } = req.body;
    if (!recipients || recipients.length === 0) return res.status(400).json({ error: 'No recipients' });
    if (recipients.length > 50) return res.status(400).json({ error: 'Max 50 recipients per batch' });
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    let sent = 0;
    for (const to of recipients) {
      await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html: message });
      sent++;
    }
    res.json({ success: true, sent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
