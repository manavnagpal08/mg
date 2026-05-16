
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

    // 2. Fetch Admin Emails from 'users' collection
    const adminsUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?key=${API_KEY}`;
    const adminsResp = await fetch(adminsUrl);
    const adminsData = await adminsResp.json();
    
    let adminEmails = [GMAIL_USER];
    if (adminsData.documents) {
      const filtered = adminsData.documents.filter(doc => {
        return doc.fields.role && doc.fields.role.stringValue === 'admin' && 
               doc.fields.isActive && doc.fields.isActive.booleanValue === true;
      });
      if (filtered.length > 0) {
        adminEmails = filtered.map(doc => doc.fields.email.stringValue);
      }
    }

    // 3. Construct Premium Email Content
    let reminderListHtml = '';
    todaysReminders.forEach(doc => {
      const f = doc.fields;
      reminderListHtml += `
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
          <div style="color: #3b82f6; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">${f.reminderType ? f.reminderType.stringValue : 'Task'}</div>
          <div style="color: #0f172a; font-weight: bold; font-size: 15px; margin-bottom: 4px;">${f.customer_name ? f.customer_name.stringValue : 'General Inquiry'}</div>
          <div style="color: #64748b; font-size: 13px; line-height: 1.4;">${f.escalationNotes ? f.escalationNotes.stringValue : 'No additional notes.'}</div>
        </div>
      `;
    });

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0f172a; padding: 32px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; letter-spacing: 1px; font-size: 22px;">DAILY TASK BRIEFING</h2>
          <p style="color: #3b82f6; margin: 8px 0 0 0; font-size: 12px; text-transform: uppercase; font-weight: bold; letter-spacing: 2px;">Envirotech ERP</p>
        </div>
        <div style="padding: 32px; color: #1e293b;">
          <p style="font-size: 16px; margin-top: 0;">Good morning Team,</p>
          <p style="color: #64748b; line-height: 1.6;">You have <strong>${todaysReminders.length}</strong> critical tasks scheduled for today, ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}.</p>
          
          <div style="margin: 24px 0;">
            ${reminderListHtml}
          </div>
          
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://envirotech-sys-2026.web.app" style="background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.5);">Open Task Manager</a>
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; color: #94a3b8; font-size: 11px;">
          This is an automated daily briefing from Envirotech ERP.<br/>Scheduled for delivery between 4:00 AM - 8:00 AM IST.
        </div>
      </div>
    `;

    // 4. Send Emails via Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });

    await transporter.sendMail({
      from: `"Envirotech Briefing" <${GMAIL_USER}>`,
      to: adminEmails.join(','),
      subject: `🕒 [BRIEFING] ${todaysReminders.length} Tasks for Today`,
      html: emailHtml
    });

    res.status(200).send('Daily reminders sent successfully.');
  } catch (error) {
    console.error('Cron Error:', error);
    res.status(500).send('Error sending reminders: ' + error.message);
  }
};
