export const bulkSendEmail = async (req, res) => {
  try {
    const { recipients, subject, message } = req.body;
    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients' });
    }
    if (recipients.length > 50) {
      return res.status(400).json({ error: 'Max 50 recipients per batch' });
    }

    // Debug logs
    console.log('EMAIL_USER present?', !!process.env.EMAIL_USER);
    console.log('EMAIL_PASS present?', !!process.env.EMAIL_PASS);
    console.log('Recipients count:', recipients.length);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    let sent = 0;
    for (const to of recipients) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html: message
      });
      sent++;
    }
    res.json({ success: true, sent });
  } catch (error) {
    console.error('Detailed SMTP error:', error);
    res.status(500).json({ error: error.message, details: error.toString() });
  }
};
