import { extractEmailsFromUrl } from '../utils/emailExtractor.js';
import Mailjet from 'node-mailjet';
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
    console.log('=== BULK EMAIL REQUEST (Mailjet) ===');
    console.log('Recipients count:', recipients?.length);

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients' });
    }
    if (recipients.length > 50) {
      return res.status(400).json({ error: 'Max 50 recipients per batch' });
    }

    const apiKey = process.env.MAILJET_API_KEY;
    const secretKey = process.env.MAILJET_SECRET_KEY;
    if (!apiKey || !secretKey) {
      console.error('❌ Mailjet keys missing');
      return res.status(500).json({ error: 'Server config: missing Mailjet keys' });
    }

    const mailjet = Mailjet.apiConnect(apiKey, secretKey);
    
    const messages = recipients.map(to => ({
      From: { Email: 'faisalchohan655@gmail.com', Name: 'LeadStriker' },
      To: [{ Email: to }],
      Subject: subject,
      HTMLPart: message,
    }));

    const request = mailjet.post('send', { version: 'v3.1' }).request({ Messages: messages });
    const result = await request;

    if (result.response.status === 200) {
      console.log(`✅ Sent to ${recipients.length} recipients`);
      res.json({ success: true, sent: recipients.length });
    } else {
      console.error('Mailjet error:', result.body);
      res.status(500).json({ error: 'Mailjet send failed', details: result.body });
    }
  } catch (error) {
    console.error('Mailjet error:', error);
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
