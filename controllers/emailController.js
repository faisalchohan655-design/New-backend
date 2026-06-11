import { extractEmailsFromUrl } from '../utils/emailExtractor.js';
import { Unosend } from '@unosend/node';
import Lead from '../models/Lead.js';

export const extractEmails = async (req, res) => {
  try {
    const { url, deep = false, maxPages = 10 } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    const leads = await extractEmailsFromUrl(url, deep, maxPages);
    res.json({ success: true, count: leads.length, leads });
  } catch (error) {
    console.error(error);
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

export const bulkSendEmail = async (req, res) => {
  try {
    const { recipients, subject, message } = req.body;
    console.log('=== BULK EMAIL REQUEST ===');
    console.log('Recipients:', recipients);
    console.log('Subject:', subject);

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients' });
    }
    if (recipients.length > 50) {
      return res.status(400).json({ error: 'Max 50 recipients per batch' });
    }

    if (!process.env.UNOSEND_API_KEY) {
      console.error('❌ UNOSEND_API_KEY missing in Railway');
      return res.status(500).json({ error: 'Server config: missing UNOSEND_API_KEY' });
    }

    const unosend = new Unosend({ apiKey: process.env.UNOSEND_API_KEY });
    let sent = 0;
    let errors = [];

    for (const to of recipients) {
      try {
        const { error } = await unosend.emails.send({
          from: 'faisalchohan655@gmail.com',
          to: to,
          subject: subject,
          html: message,
        });
        if (error) {
          console.error(`❌ Failed to send to ${to}:`, error);
          errors.push({ to, error: error.message });
        } else {
          console.log(`✅ Sent to ${to}`);
          sent++;
        }
      } catch (err) {
        console.error(`❌ Exception for ${to}:`, err.message);
        errors.push({ to, error: err.message });
      }
    }

    if (sent === 0) {
      return res.status(500).json({ error: 'Failed to send any emails', details: errors });
    }
    res.json({ success: true, sent, errors });
  } catch (error) {
    console.error('Fatal error in bulkSendEmail:', error);
    res.status(500).json({ error: error.message });
  }
};

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
