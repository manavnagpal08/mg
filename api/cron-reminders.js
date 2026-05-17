const nodemailer = require('nodemailer');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a premium HTML email for the daily admin briefing.
 * Splits reminders into "Today" (green) and "Overdue" (red) sections.
 */
function buildAdminBriefingEmail(todayItems, overdueItems, dateLabel) {
  const logoUrl = 'https://envirotechindia.com/wp-content/uploads/2020/03/Envirotech-Logo_new-1.png';
  const appUrl  = 'https://envirotech-sys-2026.web.app';

  const buildReminderCard = (item, isOverdue) => {
    const accentColor  = isOverdue ? '#DC2626' : '#059669';
    const badgeBg      = isOverdue ? '#FEF2F2' : '#F0FDF4';
    const badgeColor   = isOverdue ? '#DC2626' : '#059669';
    const badgeText    = isOverdue ? '⚠️ OVERDUE' : '📅 TODAY';
    const borderColor  = isOverdue ? '#FECACA' : '#BBF7D0';
    const type         = item.reminderType  || 'Task';
    const customer     = item.customer_name || 'General';
    const notes        = item.escalationNotes || 'No additional notes.';
    const employee     = item.employeeName  || 'Admin';
    const dateStr      = item.reminderDateStr || dateLabel;
    const timeStr      = item.reminderTimeStr ? ` at ${item.reminderTimeStr}` : '';
    const linkedId     = item.linkedId || '';

    return `
      <div style="background:#FFFFFF; border:1px solid ${borderColor}; border-left:4px solid ${accentColor}; border-radius:12px; padding:20px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <span style="background:${badgeBg}; color:${badgeColor}; font-size:11px; font-weight:700; padding:4px 10px; border-radius:20px; letter-spacing:0.5px;">${badgeText}</span>
          <span style="color:#94A3B8; font-size:12px;">${dateStr}${timeStr}</span>
        </div>
        <div style="font-size:13px; font-weight:600; color:#3B82F6; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">${type}</div>
        <div style="font-size:16px; font-weight:700; color:#0F172A; margin-bottom:6px;">${customer}</div>
        <div style="font-size:13px; color:#64748B; line-height:1.6; margin-bottom:16px;">${notes}</div>
        <div style="font-size:12px; color:#94A3B8; margin-bottom:16px;">Assigned to: <strong style="color:#475569;">${employee}</strong></div>
        <div style="display:flex; gap:10px;">
          <a href="${appUrl}/admin/reminders?done=${linkedId}" style="background:${accentColor}; color:#FFFFFF; padding:10px 18px; text-decoration:none; border-radius:8px; font-size:13px; font-weight:700; display:inline-block;">✓ Mark as Done</a>
          <a href="${appUrl}" style="background:#F1F5F9; color:#334155; padding:10px 18px; text-decoration:none; border-radius:8px; font-size:13px; font-weight:600; display:inline-block;">→ Open Dashboard</a>
        </div>
      </div>`;
  };

  const todaySection = todayItems.length > 0
    ? `<div style="margin-bottom:8px;">
         <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
           <div style="width:4px; height:28px; background:#059669; border-radius:4px;"></div>
           <span style="font-size:16px; font-weight:700; color:#0F172A;">Today's Reminders</span>
           <span style="background:#F0FDF4; color:#059669; font-size:12px; font-weight:700; padding:3px 10px; border-radius:20px; margin-left:auto;">${todayItems.length} task${todayItems.length > 1 ? 's' : ''}</span>
         </div>
         ${todayItems.map(i => buildReminderCard(i, false)).join('')}
       </div>`
    : '';

  const overdueSection = overdueItems.length > 0
    ? `<div style="margin-bottom:8px;">
         <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
           <div style="width:4px; height:28px; background:#DC2626; border-radius:4px;"></div>
           <span style="font-size:16px; font-weight:700; color:#0F172A;">Overdue Tasks</span>
           <span style="background:#FEF2F2; color:#DC2626; font-size:12px; font-weight:700; padding:3px 10px; border-radius:20px; margin-left:auto;">${overdueItems.length} overdue</span>
         </div>
         ${overdueItems.map(i => buildReminderCard(i, true)).join('')}
       </div>`
    : '';

  const noTasksNote = (todayItems.length === 0 && overdueItems.length === 0)
    ? `<div style="text-align:center; padding:40px 20px; color:#94A3B8;">
         <div style="font-size:48px; margin-bottom:16px;">✅</div>
         <div style="font-size:18px; font-weight:600; color:#0F172A;">All Clear!</div>
         <div style="font-size:14px; margin-top:8px;">No pending reminders for today.</div>
       </div>`
    : '';

  const total = todayItems.length + overdueItems.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Envirotech Daily Briefing</title>
</head>
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width:640px; margin:32px auto; background:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.12);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%); padding:36px 40px; text-align:center; position:relative;">
      <img src="${logoUrl}" alt="Envirotech" style="height:50px; object-fit:contain; margin-bottom:20px; filter:brightness(0) invert(1); opacity:0.9;"/>
      <div style="font-size:11px; color:#60A5FA; font-weight:700; text-transform:uppercase; letter-spacing:3px; margin-bottom:8px;">Daily Task Briefing</div>
      <div style="font-size:26px; font-weight:800; color:#FFFFFF; margin-bottom:6px;">Envirotech Instruments</div>
      <div style="font-size:12px; color:#94A3B8; letter-spacing:0.5px;">Precision Engineering for a Sustainable Future</div>
    </div>

    <!-- Date & Summary Banner -->
    <div style="background:#3B82F6; padding:18px 40px; display:flex; align-items:center; justify-content:space-between;">
      <div style="color:#FFFFFF;">
        <div style="font-size:13px; opacity:0.85;">Good morning, Team 👋</div>
        <div style="font-size:15px; font-weight:700; margin-top:2px;">${dateLabel}</div>
      </div>
      <div style="background:rgba(255,255,255,0.2); padding:10px 20px; border-radius:30px; text-align:center;">
        <div style="font-size:24px; font-weight:800; color:#FFFFFF; line-height:1;">${total}</div>
        <div style="font-size:11px; color:rgba(255,255,255,0.85); font-weight:600;">Task${total !== 1 ? 's' : ''} Today</div>
      </div>
    </div>

    <!-- Content -->
    <div style="padding:32px 40px;">
      ${noTasksNote}
      ${todaySection}
      ${overdueItems.length > 0 && todayItems.length > 0 ? '<div style="height:8px;"></div>' : ''}
      ${overdueSection}
    </div>

    <!-- CTA Footer Banner -->
    <div style="background:#F8FAFC; border-top:1px solid #E2E8F0; padding:28px 40px; text-align:center;">
      <a href="${appUrl}" style="background:linear-gradient(135deg, #3B82F6, #2563EB); color:#FFFFFF; padding:14px 36px; text-decoration:none; border-radius:12px; font-weight:700; font-size:15px; display:inline-block; box-shadow:0 4px 14px rgba(59,130,246,0.4);">
        Open Admin Dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="background:#0F172A; padding:24px 40px; text-align:center;">
      <img src="${logoUrl}" alt="Envirotech" style="height:28px; object-fit:contain; margin-bottom:12px; filter:brightness(0) invert(1); opacity:0.5;"/>
      <div style="color:#64748B; font-size:12px; line-height:1.8;">
        <strong style="color:#94A3B8;">Envirotech Instruments Pvt. Ltd.</strong><br/>
        📞 9896817707 &nbsp;|&nbsp; 🌐 envirotechindia.com<br/><br/>
        This is an automated daily briefing. Please do not reply to this email.<br/>
        © ${new Date().getFullYear()} Envirotech Instruments Pvt. Ltd. All rights reserved.
      </div>
    </div>

  </div>
</body>
</html>`;
}

// ─── Main Handler ────────────────────────────────────────────────────────────

module.exports = async (req, res) => {

  const PROJECT_ID = 'envirotech-sys-2026';
  const API_KEY    = process.env.FIREBASE_API_KEY;
  const GMAIL_USER = process.env.GMAIL_USER || 'envirotechadmin@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_PASS;

  try {
    // ── 1. Fetch all pending reminders from Firestore REST API ──────────────
    const remindersUrl =
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/reminder_logs?key=${API_KEY}`;
    const remindersResp = await fetch(remindersUrl);
    const remindersData = await remindersResp.json();

    if (!remindersData.documents || remindersData.documents.length === 0) {
      return res.status(200).json({ message: 'No reminders found.', sent: 0 });
    }

    // ── 2. Split into Today vs Overdue ──────────────────────────────────────
    const now         = new Date();
    // IST offset: UTC+5:30
    const istOffset   = 5.5 * 60 * 60 * 1000;
    const nowIST      = new Date(now.getTime() + istOffset);
    const todayStartIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
    const todayEndIST   = new Date(todayStartIST.getTime() + 24 * 60 * 60 * 1000);

    const todayItems   = [];
    const overdueItems = [];

    const idsToMark = [];

    for (const doc of remindersData.documents) {
      const f = doc.fields || {};
      const isDone       = f.is_done?.booleanValue === true;
      const isNotified   = f.isNotified?.booleanValue === true;
      const dateTs       = f.reminderDate?.timestampValue;

      if (isDone || !dateTs) continue;

      const remDate = new Date(dateTs);
      // Convert reminder date to IST for comparison
      const remIST  = new Date(remDate.getTime() + istOffset);

      const itemData = {
        reminderType:    f.reminderType?.stringValue    || 'Task',
        customer_name:   f.customer_name?.stringValue   || 'General Inquiry',
        escalationNotes: f.escalationNotes?.stringValue || '',
        employeeName:    f.employeeName?.stringValue    || 'Admin',
        linkedId:        f.linkedId?.stringValue        || doc.name.split('/').pop(),
        reminderDateStr: remIST.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        reminderTimeStr: f.reminderTime?.stringValue    || null,
      };

      const docId = doc.name.split('/').pop();

      if (remIST >= todayStartIST && remIST < todayEndIST) {
        // Due today — send if not yet notified
        if (!isNotified) {
          todayItems.push(itemData);
          idsToMark.push(docId);
        }
      } else if (remIST < todayStartIST) {
        // Past due — always show in overdue (re-notify)
        overdueItems.push(itemData);
        idsToMark.push(docId);
      }
    }

    if (todayItems.length === 0 && overdueItems.length === 0) {
      return res.status(200).json({ message: 'No new/overdue reminders to send.', sent: 0 });
    }

    // ── 3. Fetch admin emails ───────────────────────────────────────────────
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
        adminEmails = [...new Set([
          GMAIL_USER,
          ...filtered.map(d => d.fields.email.stringValue)
        ])];
      }
    }

    // ── 4. Build & send premium HTML email ─────────────────────────────────
    const dateLabel = nowIST.toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const htmlEmail = buildAdminBriefingEmail(todayItems, overdueItems, dateLabel);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });

    await transporter.sendMail({
      from:    `"Envirotech ERP" <${GMAIL_USER}>`,
      to:      adminEmails.join(','),
      subject: `📋 [Envirotech Briefing] ${todayItems.length} Today · ${overdueItems.length} Overdue — ${dateLabel}`,
      html:    htmlEmail,
    });

    // ── 5. Mark today's reminders as notified (avoid duplicate daily emails) ──
    // Only mark today's — overdue ones will keep appearing until done
    for (const docId of idsToMark.filter((_, i) => i < todayItems.length)) {
      const patchUrl =
        `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/reminder_logs/${docId}?updateMask.fieldPaths=isNotified&key=${API_KEY}`;
      await fetch(patchUrl, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fields: { isNotified: { booleanValue: true } } }),
      });
    }

    return res.status(200).json({
      message: 'Daily briefing sent successfully.',
      adminEmails,
      todayCount:   todayItems.length,
      overdueCount: overdueItems.length,
    });

  } catch (error) {
    console.error('Cron Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
