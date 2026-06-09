import express from 'express';
const router = express.Router();

// POST /api/emails/extract
router.post('/extract', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL required'
      });
    }

    console.log('Extracting email from:', url);

    // فلحال dummy data - emailExtractor فائل نہیں ہے
    const dummyEmail = 'contact@' + url.replace(/https?:\/\//, '').split('/')[0];

    if (dummyEmail) {
      return res.json({
        success: true,
        email: dummyEmail,
        url: url
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router; // <-- import/export والا
