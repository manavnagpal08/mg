const nodemailer = require('nodemailer');

// Vercel Serverless Function — no cold-start delay, no sleep issues
module.exports = async (req, res) => {
  // Allow CORS from any origin (required for Flutter Web)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Envirotech Mail Server</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; }
            .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; }
            .status { color: #10b981; font-weight: bold; font-size: 24px; margin-bottom: 10px; }
            .desc { color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="status">● System Online</div>
            <div class="desc">Envirotech ERP Mail Proxy is active and ready.</div>
          </div>
        </body>
      </html>
    `);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { adminEmail, appPassword, to, subject, text, html } = req.body;

  if (!adminEmail || !appPassword || !to) {
    return res.status(400).json({ error: 'Missing required fields: adminEmail, appPassword, to' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: adminEmail,
      pass: appPassword,
    },
  });

  const mailOptions = {
    from: `Envirotech ERP <${adminEmail}>`,
    to: Array.isArray(to) ? to.join(',') : to,
    subject: subject || '(No Subject)',
    text: text || '',
    html: html || text || '',
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return res.status(200).json({ message: 'Email sent successfully', response: info.response });
  } catch (error) {
    console.error('Email error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
