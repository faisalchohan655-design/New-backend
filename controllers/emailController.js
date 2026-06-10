import axios from 'axios';
import Lead from '../models/Lead.js';

// --- NEW: Helper function to call Apify API ---
async function extractEmailsWithApify(url, maxPages = 10) {
    const apiKey = process.env.APIFY_API_KEY;
    const actorId = process.env.APIFY_EMAIL_SCRAPER_ACTOR_ID;

    if (!apiKey || !actorId) {
        throw new Error('Apify API credentials missing. Cannot extract emails.');
    }

    // Prepare the payload for the Apify Actor
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

    // Wait for the Actor to finish and fetch results
    let datasetId = null;
    for (let i = 0; i < 30; i++) { // Poll for 30 seconds
        const statusResponse = await axios.get(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
        if (statusResponse.data.data.status === 'SUCCEEDED') {
            datasetId = statusResponse.data.data.defaultDatasetId;
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }

    if (!datasetId) {
        throw new Error('Apify Actor failed to finish.');
    }

    // Fetch the extracted data
    const datasetResponse = await axios.get(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&clean=true`);
    const results = datasetResponse.data;

    // Format results to match our old `extractedLeads` structure
    const extractedLeads = [];
    for (const item of results) {
        for (const email of item.emails || []) {
            extractedLeads.push({
                email: email,
                source: url,
                verified: true, // Apify does basic validation
                phone: item.telephones?.[0] || ''
            });
        }
    }
    return extractedLeads;
}

// Update the existing `extractEmails` function
export const extractEmails = async (req, res) => {
    try {
        const { url, deep = false, maxPages = 10 } = req.body;
        if (!url) return res.status(400).json({ error: 'URL required' });

        // Call our new Apify function
        const leads = await extractEmailsWithApify(url, maxPages);
        
        res.json({ success: true, count: leads.length, leads });
    } catch (error) {
        console.error('Email extraction error:', error);
        res.status(500).json({ error: error.message });
    }
};

// (Aap ki existing bulkExtractEmails, saveExtractedLeads, bulkSendEmail functions yahan pe waise hi rahein gi)
