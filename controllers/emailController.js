import { Unosend } from '@unosend/node';

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

    // Check API key
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
