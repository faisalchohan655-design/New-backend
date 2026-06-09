// Backend File: backend/routes/outreach.js
// Purpose: API route to extract email from website

const express = require('express');
const router = express.Router();
const { extractEmailFromWebsite } = require('../emailExtractor');

// POST /api/extract-email
router.post('/extract-email', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL is required' 
            });
        }

        console.log('Extracting email from:', url);

        const email = await extractEmailFromWebsite(url);

        if (email) {
            return res.json({ 
                success: true, 
                email: email 
            });
        } else {
            return res.json({ 
                success: false, 
                email: null,
                message: 'No email found' 
            });
        }

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
