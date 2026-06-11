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

    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY missing in Railway');
      return res.status(500).json({ error: 'Server config: missing BREVO_API_KEY' });
    }

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    let sent = 0;
    let errors = [];

    for (const to of recipients) {
      const sendSmtpEmail = new Brevo.SendSmtpEmail();
      sendSmtpEmail.to = [{ email: to }];
      sendSmtpEmail.sender = { email: 'faisalchohan655@gmail.com' };
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = message;

      try {
        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`✅ Sent to ${to}`, result?.messageId);
        sent++;
      } catch (err) {
        // Log the FULL error from Brevo
        console.error(`❌ Failed to send to ${to}:`, err.response?.body || err.message);
        errors.push({ to, error: err.response?.body?.message || err.message });
      }
    }

    if (sent === 0) {
      return res.status(500).json({ error: 'Failed to send any emails', details: errors });
    }
    res.json({ success: true, sent, errors });
  } catch (error) {
    console.error('🔥 Outer catch:', error);
    res.status(500).json({ error: error.message });
  }
};
