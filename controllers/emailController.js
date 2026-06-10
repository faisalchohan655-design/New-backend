import axios from 'axios';
import Lead from '../models/Lead.js';

// Helper: Call Apify Actor and get results
async function extractWithApify(startUrl, maxPages = 10) {
  const apiKey = process.env.APIFY_API_KEY;
  const actorId = process.env.APIFY_EMAIL_SCRAPER_ACTOR_ID;
  if (!apiKey || !actorId) throw new Error('Apify credentials missing');

  // 1. Start the actor run
  const runResponse = await axios.post(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
    {
      startUrls: [{ url: startUrl }],
      maxPagesPerCrawl: maxPages,
      extractEmails: true,
      extractPhones: true,
      extractSocialProfiles: false
    }
  );
  const runId = runResponse.data.data.id;

  // 2. Wait for completion (polling)
  let status = 'RUNNING';
  let datasetId = null;
  for (let i = 0; i < 30; i++) { // max 30 seconds wait
    const statusRes = await axios.get(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
    status = statusRes.data.data.status;
    if (status === 'SUCCEEDED') {
      datasetId = statusRes.data.data.defaultDatasetId;
      break;
    }
    if (status === 'FAILED' || status === 'ABORTED') break;
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!datasetId) throw new Error('Actor failed or timed out');

  // 3. Fetch results
  const datasetRes = await axios.get(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&clean=true`);
  const items = datasetRes.data;

  // 4. Format results
  const leads = [];
  for (const item of items) {
    const emails = item.emails || [];
    const phones = item.phones || item.telephones || [];
    for (const email of emails) {
      leads.push({
        email: email,
        source: startUrl,
        verified: true, // Apify does basic validation
        phone: phones[0] || ''
      });
    }
  }
  return leads;
}

export const extractEmails = async (req, res) => {
  try {
    const { url, maxPages = 10 } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    const leads = await extractWithApify(url, maxPages);
    res.json({ success: true, count: leads.length, leads });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const bulkExtractEmails = async (req, res) => {
  try {
    const { urls, maxPagesPerUrl = 5 } = req.body;
    if (!urls || !urls.length) return res.status(400).json({ error: 'URLs required' });
    let allLeads = [];
    for (const url of urls.slice(0, 20)) {
      const leads = await extractWithApify(url, maxPagesPerUrl);
      allLeads.push(...leads);
    }
    // deduplicate by email
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
    let savedCount = 0;
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
        savedCount++;
      }
    }
    res.json({ success: true, saved: savedCount });
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
