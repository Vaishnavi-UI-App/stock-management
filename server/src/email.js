// Email helper.
//
// Sends real email when SMTP is configured via env vars; otherwise falls back to
// logging the full message to the server console so every flow (forgot-password,
// new-user setup link, etc.) is still testable without a mail provider. The
// moment SMTP_* env vars are added, real delivery starts with no code changes.
//
// Required env for real delivery:
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS
//   SMTP_SECURE=true  (use for port 465; leave unset/false for 587 STARTTLS)
//   SMTP_FROM         (From: address; defaults to SMTP_USER)

let nodemailer = null;
try {
  // Optional dependency — only needed when SMTP is configured.
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

let cachedTransporter; // undefined = not built yet, false = no SMTP configured

function getTransporter() {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  if (!host || !nodemailer) {
    cachedTransporter = false;
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return cachedTransporter;
}

// sendMail({ to, subject, text, html }) -> { sent, delivery }
// Never throws for the console path; on real SMTP failure it logs and reports
// sent:false so callers can decide whether to surface an error.
async function sendMail({ to, subject, text, html }) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log('\n========== EMAIL (SMTP not configured — logged only) ==========');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('---------------------------------------------------------------');
    console.log(text || (html ? html.replace(/<[^>]+>/g, '') : ''));
    console.log('===============================================================\n');
    return { sent: false, delivery: 'console' };
  }

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@dynamicindia.local';
    await transporter.sendMail({ from, to, subject, text, html });
    return { sent: true, delivery: 'smtp' };
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, err.message);
    return { sent: false, delivery: 'error', error: err.message };
  }
}

module.exports = { sendMail };
