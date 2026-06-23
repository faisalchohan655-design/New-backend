// backend/controllers/emailController.js
import { extractEmailsFromUrl } from '../utils/emailExtractor.js';
import Lead from '../models/Lead.js';
import nodemailer from 'nodemailer';

// ============================================
// ✅ EMAIL TRANSPORTER
// ============================================
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ============================================
// ✅ EXTRACT EMAILS FROM URL
// ============================================
export const extractEmails = async (req, res) => {
  try {
    const { url, deep = false, maxPages = 10, extractSocial = true } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    const leads = await extractEmailsFromUrl(url, deep, maxPages);
    res.json({ success: true, count: leads.length, leads });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// ✅ BULK EXTRACT EMAILS
// ============================================
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

// ============================================
// ✅ SAVE EXTRACTED LEADS
// ============================================
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
          source: 'email_extracted',
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

// ============================================
// ✅ BULK SEND EMAIL (Nodemailer)
// ============================================
export const bulkSendEmail = async (req, res) => {
  try {
    const { recipients, subject, message } = req.body;
    
    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients' });
    }

    const results = [];
    let sent = 0;
    let failed = 0;

    for (const email of recipients) {
      try {
        const info = await transporter.sendMail({
          from: `"LeadConnect Pro" <${process.env.SMTP_USER}>`,
          to: email,
          subject: subject || 'Hello from LeadConnect Pro',
          html: message || 'Hi,<br><br>I hope this email finds you well.<br><br>Best regards,<br>Team LeadConnect'
        });
        sent++;
        results.push({ email, status: 'sent', messageId: info.messageId });
      } catch (error) {
        failed++;
        results.push({ email, status: 'failed', error: error.message });
      }
    }

    res.json({ success: true, sent, failed, total: recipients.length, results });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// ✅ EXTRACT EMAILS FROM LEAD IDs
// ============================================
export const extractEmailsFromLeadIds = async (req, res) => {
  try {
    const { leadIds, deep = false, maxPagesPerUrl = 5 } = req.body;
    if (!leadIds || !leadIds.length) {
      return res.status(400).json({ error: 'No lead IDs provided' });
    }

    const leads = await Lead.find({ _id: { $in: leadIds }, website: { $ne: '', $exists: true } });
    const results = [];
    let totalNewEmails = 0;

    for (const lead of leads) {
      const extracted = await extractEmailsFromUrl(lead.website, deep, maxPagesPerUrl);
      for (const item of extracted) {
        const existing = await Lead.findOne({ email: item.email });
        if (!existing) {
          const newLead = new Lead({
            name: `Email from ${lead.website}`,
            email: item.email,
            phone: item.phone || '',
            website: lead.website,
            address: lead.address,
            rating: item.verified ? 3 : 1,
            placeId: `email_${Date.now()}_${Math.random()}`,
            source: 'email_extracted',
            parentLeadId: lead._id,
            createdAt: new Date()
          });
          await newLead.save();
          totalNewEmails++;
          results.push({ leadId: lead._id, website: lead.website, email: item.email, verified: item.verified });
        }
      }
    }
    res.json({ success: true, totalNewEmails, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
