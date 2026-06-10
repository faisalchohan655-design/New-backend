import axios from 'axios';
import Lead from '../models/Lead.js';

// --- Helper: Call Apify API ---
async function extractEmailsWithApify(url, maxPages = 10) {
    const apiKey = process.env.APIFY_API_KEY;
    const actorId = process.env.APIFY_EMAIL_SCRAPER_ACTOR_ID;
    if (!apiKey || !actorId) {
        throw new Error('Apify API credentials missing. Cannot extract emails.');
    }

    const payload = {
        "startUrls": [{ "url": url }],
        "maxPagesPerCrawl": maxPages,
        "extractEmail": true,
        "extractPhone": true,
        "extractSocial": false
    };

    // Start the Actor run
    const runResponse = await axios.post(
        `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
        payload
    );
    const runId = runResponse.data.data.id;

    // Wait for completion (poll up to 30 seconds)
    let datasetId = null;
    for (let i = 0; i < 30; i++) {
        const statusResponse = await axios.get(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
        if (statusResponse.data.data.status === 'SUCCEEDED') {
            datasetId = statusResponse.data.data.defaultDatasetId;
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!datasetId) throw new Error('Apify Actor failed to finish.');

    // Fetch results
    const datasetResponse = await axios.get(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&clean=true`);
    const results = datasetResponse.data;

    const extractedLeads = [];
    for (const item of results) {
        for (const email of item.emails || []) {
            extractedLeads.push({
                email: email,
                source: url,
                verified: true,
                phone: item.telephones?.[0] || ''
            });
        }
    }
    return extractedLeads;
}

// 1. Single URL extraction
export const extractEmails = async (req, res) => {
    try {
        const { url, maxPages = 10 } = req.body;
        if (!url) return res.status(400).json({ error: 'URL required' });
        const leads = await extractEmailsWithApify(url, maxPages);
        res.json({ success: true, count: leads.length, leads });
    } catch (error) {
        console.error('Extraction error:', error);
        res.status(500).json({ error: error.message });
    }
};

// 2. Bulk URLs extraction
export const bulkExtractEmails = async (req, res) => {
    try {
        const { urls, maxPagesPerUrl = 5 } = req.body;
        if (!urls || !urls.length) return res.status(400).json({ error: 'URLs required' });
        let allLeads = [];
        for (const url of urls.slice(0, 20)) {
            const leads = await extractEmailsWithApify(url, maxPagesPerUrl);
            allLeads.push(...leads);
        }
        // Remove duplicates by email
        const unique = new Map();
        for (const lead of allLeads) unique.set(lead.email, lead);
        res.json({ success: true, count: unique.size, leads: Array.from(unique.values()) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Save extracted leads to database
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

// 4. Send bulk emails (max 50)
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
