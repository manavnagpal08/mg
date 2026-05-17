const nodemailer = require('nodemailer');

/**
 * Hourly Cron — Fixed-Time Reminders
 * Checks reminder_logs for items with a specific `reminderTime` (e.g. "10:30")
 * that matches the current IST hour, and sends a targeted alert to admins.
 */
module.exports = async (req, res) => {
  const PROJECT_ID = 'envirotech-sys-2026';
  const API_KEY    = process.env.FIREBASE_API_KEY;
  const GMAIL_USER = process.env.GMAIL_USER || 'envirotechadmin@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_PASS;

  try {
    // Current IST hour
    const now       = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST    = new Date(now.getTime() + istOffset);
    const currentHH = String(nowIST.getHours()).padStart(2, '0');
    const currentMM = String(nowIST.getMinutes()).padStart(2, '0');
    // We match on the hour (e.g. "10:00" to "10:59" all match hour "10")
    const currentHour = `${currentHH}`;

    const todayStartIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
    const todayEndIST   = new Date(todayStartIST.getTime() + 24 * 60 * 60 * 1000);

    // Fetch reminders
    const url  = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/reminder_logs?key=${API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.documents || data.documents.length === 0) {
      return res.status(200).json({ message: 'No reminders found.', sent: 0 });
    }

    // Filter: not done, has a specific reminderTime for current hour, due today
    const dueNow = data.documents.filter(doc => {
      const f            = doc.fields || {};
      const isDone       = f.is_done?.booleanValue === true;
      const timeValue    = f.reminderTime?.stringValue || ''; // e.g. "10:30"
      const dateTs       = f.reminderDate?.timestampValue;

      if (isDone || !timeValue || !dateTs) return false;

      const remDate    = new Date(dateTs);
      const remIST     = new Date(remDate.getTime() + istOffset);
      const isToday    = remIST >= todayStartIST && remIST < todayEndIST;
      const hourMatch  = timeValue.startsWith(currentHour + ':');

      return isToday && hourMatch;
    });

    if (dueNow.length === 0) {
      return res.status(200).json({ message: `No fixed-time reminders for hour ${currentHour}:xx.`, sent: 0 });
    }

    // Fetch admin emails
    const adminsUrl  = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?key=${API_KEY}`;
    const adminsResp = await fetch(adminsUrl);
    const adminsData = await adminsResp.json();

    let adminEmails = [GMAIL_USER];
    if (adminsData.documents) {
      const filtered = adminsData.documents.filter(d =>
        d.fields?.role?.stringValue === 'admin' &&
        d.fields?.isActive?.booleanValue === true &&
        d.fields?.email?.stringValue
      );
      if (filtered.length > 0) {
        adminEmails = [...new Set([GMAIL_USER, ...filtered.map(d => d.fields.email.stringValue)])];
      }
    }

    // Build email for each due-now reminder
    const logoUrl = 'https://envirotechindia.com/wp-content/uploads/2020/03/Envirotech-Logo_new-1.png';
    const appUrl  = 'https://envirotech-sys-2026.web.app';

    const reminderCards = dueNow.map(doc => {
      const f = doc.fields || {};
      const type     = f.reminderType?.stringValue    || 'Reminder';
      const customer = f.customer_name?.stringValue   || 'General';
      const notes    = f.escalationNotes?.stringValue || '';
      const employee = f.employeeName?.stringValue    || 'Admin';
      const timeStr  = f.reminderTime?.stringValue    || `${currentHH}:${currentMM}`;
      const linkedId = f.linkedId?.stringValue        || doc.name.split('/').pop();

      return `
        <div style="background:#FFFBEB; border:1px solid #FDE68A; border-left:4px solid #F59E0B; border-radius:12px; padding:20px; margin-bottom:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <span style="background:#FEF3C7; color:#D97706; font-size:11px; font-weight:700; padding:4px 12px; border-radius:20px;">🔔 DUE NOW — ${timeStr}</span>
          </div>
          <div style="font-size:13px; font-weight:600; color:#3B82F6; text-transform:uppercase; margin-bottom:4px;">${type}</div>
          <div style="font-size:16px; font-weight:700; color:#0F172A; margin-bottom:6px;">${customer}</div>
          <div style="font-size:13px; color:#64748B; line-height:1.6; margin-bottom:12px;">${notes}</div>
          <div style="font-size:12px; color:#94A3B8; margin-bottom:16px;">Assigned to: <strong style="color:#475569;">${employee}</strong></div>
          <div style="display:flex; gap:10px;">
            <a href="${appUrl}/admin/reminders?done=${linkedId}" style="background:#F59E0B; color:#FFFFFF; padding:10px 18px; text-decoration:none; border-radius:8px; font-size:13px; font-weight:700; display:inline-block;">✓ Mark as Done</a>
            <a href="${appUrl}" style="background:#F1F5F9; color:#334155; padding:10px 18px; text-decoration:none; border-radius:8px; font-size:13px; font-weight:600; display:inline-block;">→ Open Dashboard</a>
          </div>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0; padding:0; background:#F1F5F9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width:640px; margin:32px auto; background:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.12);">

    <div style="background:linear-gradient(135deg, #92400E 0%, #B45309 100%); padding:32px 40px; text-align:center;">
      <img src="${logoUrl}" alt="Envirotech" style="height:44px; object-fit:contain; margin-bottom:16px; filter:brightness(0) invert(1); opacity:0.9;"/>
      <div style="font-size:11px; color:#FDE68A; font-weight:700; text-transform:uppercase; letter-spacing:3px; margin-bottom:8px;">⏰ Timed Reminder Alert</div>
      <div style="font-size:22px; font-weight:800; color:#FFFFFF;">${dueNow.length} Reminder${dueNow.length > 1 ? 's' : ''} Due Now</div>
      <div style="font-size:13px; color:#FDE68A; margin-top:6px;">${currentHH}:${currentMM} IST — ${nowIST.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</div>
    </div>

    <div style="padding:32px 40px;">
      <p style="color:#64748B; font-size:15px; margin-top:0; margin-bottom:24px;">
        The following task${dueNow.length > 1 ? 's' : ''} ${dueNow.length > 1 ? 'were' : 'was'} scheduled for <strong>${currentHH}:xx</strong> today and require${dueNow.length === 1 ? 's' : ''} your immediate attention.
      </p>
      ${reminderCards}
    </div>

    <div style="background:#F8FAFC; border-top:1px solid #E2E8F0; padding:24px 40px; text-align:center;">
      <a href="${appUrl}" style="background:linear-gradient(135deg, #F59E0B, #D97706); color:#FFFFFF; padding:14px 36px; text-decoration:none; border-radius:12px; font-weight:700; font-size:15px; display:inline-block; box-shadow:0 4px 14px rgba(245,158,11,0.4);">Open Admin Dashboard →</a>
    </div>

    <div style="background:#0F172A; padding:20px 40px; text-align:center;">
      <div style="color:#64748B; font-size:11px; line-height:1.8;">
        <strong style="color:#94A3B8;">Envirotech Instruments Pvt. Ltd.</strong><br/>
        📞 9896817707 &nbsp;|&nbsp; 🌐 envirotechindia.com<br/><br/>
        Automated timed reminder. Do not reply. &nbsp;© ${new Date().getFullYear()} Envirotech.
      </div>
    </div>
  </div>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });

    await transporter.sendMail({
      from:    `"Envirotech ERP" <${GMAIL_USER}>`,
      to:      adminEmails.join(','),
      subject: `⏰ [Envirotech] ${dueNow.length} Timed Reminder${dueNow.length > 1 ? 's' : ''} Due at ${currentHH}:${currentMM} IST`,
      html,
    });

    return res.status(200).json({ message: 'Hourly reminders sent.', count: dueNow.length, adminEmails });

  } catch (error) {
    console.error('Hourly Cron Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
