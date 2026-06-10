import axios from 'axios';
import Lead from '../models/Lead.js';

// Helper: Call Apify actor to extract emails
async function extractEmailsWithApify(url, maxPages = 10) {
  const apiKey = process.env.APIFY_API_KEY;
  const actorId = process.env.APIFY_EMAIL_SCRAPER_ACTOR_ID;
  if (!apiKey || !actorId) {
    throw new Error('Apify credentials missing. Set APIFY_API_KEY and APIFY_EMAIL_SCRAPER_ACTOR_ID');
  }

  // Prepare input for vdrmota/contact-info-scraper
  const input = {
    startUrls: [{ url }],
    maxRequestsPerStartUrl: maxPages,
    mergeContacts: true,
    maxDepth: 2,
    sameDomain: true,
    scrapeSocialMediaProfiles: { facebooks: false, instagrams: false, youtubes: false, twitters: false },
    useBrowser: false,
    proxyConfig: { useApifyProxy: true }
  };

  // Start actor run
  const runResponse = await axios.post(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
    input,
    { headers: { 'Content-Type': 'application/json' } }
  );
  const runId = runResponse.data.data.id;

  // Poll for completion
  let datasetId = null;
  for (let i = 0; i < 60; i++) { // wait up to 60 seconds
    const statusRes = await axios.get(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
    if (statusRes.data.data.status === 'SUCCEEDED') {
      datasetId = statusRes.data.data.defaultDatasetId;
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  if (!datasetId) throw new Error('Apify actor did not finish in time');

  // Fetch results
  const datasetRes = await axios.get(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&clean=true`);
  const items = datasetRes.data;

  // Format results
  const leads = [];
  for (const item of items) {
    const emails = item.emails || [];
    for (const email of emails) {
      leads.push({
        email,
        source: url,
        verified: true, // Apify validates emails
        phone: item.telephones?.[0] || ''
      });
    }
  }
  return leads;
}

export const extractEmails = async (req, res) => {
  try {
    const { url, deep = false, maxPages = 10 } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    const leads = await extractEmailsWithApify(url, maxPages);
    res.json({ success: true, count: leads.length, leads });
  } catch (error) {
    console.error('Email extraction error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const bulkExtractEmails = async (req, res) => {
  try {
    const { urls, deep = false, maxPagesPerUrl = 5 } = req.body;
    if (!urls || !urls.length) return res.status(400).json({ error: 'URLs required' });
    let allLeads = [];
    for (const url of urls.slice(0, 20)) {
      const leads = await extractEmailsWithApify(url, maxPagesPerUrl);
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
