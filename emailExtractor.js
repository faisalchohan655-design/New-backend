// Backend File: backend/emailExtractor.js
// Purpose: Extract email from website URL

const axios = require('axios');
const cheerio = require('cheerio');

async function extractEmailFromWebsite(url) {
    try {
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        let emails = new Set();

        const textEmails = html.match(emailRegex);
        if (textEmails) {
            textEmails.forEach(email => emails.add(email.toLowerCase()));
        }

        $('a[href^="mailto:"]').each((i, el) => {
            const email = $(el).attr('href').replace('mailto:', '').split('?')[0];
            if (email) emails.add(email.toLowerCase());
        });

        const filteredEmails = Array.from(emails).filter(email => {
            return!email.includes('example.com') &&
                 !email.includes('sentry');
        });

        return filteredEmails.length > 0? filteredEmails[0] : null;

    } catch (error) {
        console.log('Error:', error.message);
        return null;
    }
}

module.exports = { extractEmailFromWebsite };
