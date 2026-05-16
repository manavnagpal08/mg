
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // 1. Validate Secret (Optional but recommended for Cron security)
  // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).end('Unauthorized');
  // }

  const PROJECT_ID = 'envirotech-sys-2026';
  const API_KEY = process.env.FIREBASE_API_KEY; // User sets this in Vercel
  const GMAIL_USER = 'envirotechadmin@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_PASS; // User sets this in Vercel

  try {
    // 1. Fetch Today's Reminders from Firestore REST API
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.month(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.month(), now.getDate() + 1).toISOString();

    // Query for reminders where is_done is false and date is today
    // Note: REST API query is complex, using simple fetch for now
    const remindersUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/reminder_logs?key=${API_KEY}`;
    const remindersResp = await fetch(remindersUrl);
    const remindersData = await remindersResp.json();

    if (!remindersData.documents || remindersData.documents.length === 0) {
      return res.status(200).send('No reminders for today.');
    }

    const todaysReminders = remindersData.documents.filter(doc => {
      const fields = doc.fields;
      const isDone = fields.is_done ? fields.is_done.booleanValue : false;
      const dateStr = fields.reminderDate ? fields.reminderDate.timestampValue : '';
      return !isDone && dateStr >= startOfDay && dateStr < endOfDay;
    });

    if (todaysReminders.length === 0) {
      return res.status(200).send('No pending reminders for today.');
    }

    // 2. Fetch Admin Emails
    const adminsUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admins?key=${API_KEY}`;
    const adminsResp = await fetch(adminsUrl);
    const adminsData = await adminsResp.json();
    
    const adminEmails = adminsData.documents 
      ? adminsData.documents.map(doc => doc.fields.email.stringValue)
      : [GMAIL_USER];

    // 3. Construct Email Content
    let reminderListHtml = '';
    todaysReminders.forEach(doc => {
      const f = doc.fields;
      reminderListHtml += `
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong style="color: #2563eb;">${f.reminderType ? f.reminderType.stringValue : 'Task'}</strong><br/>
          <span style="font-size: 14px; color: #4b5563;">
            Customer: ${f.customer_name ? f.customer_name.stringValue : 'N/A'}<br/>
            Note: ${f.escalationNotes ? f.escalationNotes.stringValue : 'N/A'}
          </span>
        </div>
      `;
    });

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">Daily System Briefing</h1>
          <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.8;">Envirotech ERP Reminders</p>
        </div>
        <div style="padding: 20px;">
          <p>Hello Team,</p>
          <p>You have <strong>${todaysReminders.length}</strong> tasks scheduled for today:</p>
          ${reminderListHtml}
          <div style="margin-top: 25px; text-align: center;">
            <a href="https://envirotech-sys-2026.web.app" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Dashboard</a>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
          Automated System Notification • Envirotech Systems
        </div>
      </div>
    `;

    // 4. Send Emails via Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });

    await transporter.sendMail({
      from: `"Envirotech System" <${GMAIL_USER}>`,
      to: adminEmails.join(','),
      subject: `[ACTION REQUIRED] Today's Tasks: ${todaysReminders.length} Reminders`,
      html: emailHtml
    });

    res.status(200).send('Daily reminders sent successfully.');
  } catch (error) {
    console.error('Cron Error:', error);
    res.status(500).send('Error sending reminders: ' + error.message);
  }
};
