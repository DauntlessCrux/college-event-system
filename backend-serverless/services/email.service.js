const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// If no SMTP is configured (typical for a college project demo), we just
// log the email to the console so the flow is still fully testable.
async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    console.log('\n----- EMAIL (SMTP not configured, logging instead) -----');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(html.replace(/<[^>]+>/g, ' '));
    console.log('----------------------------------------------------------\n');
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@college.edu',
    to,
    subject,
    html,
  });
}

async function sendOtpEmail(to, otp) {
  await sendEmail({
    to,
    subject: 'Your college email verification code',
    html: `<p>Your verification code is:</p><h2>${otp}</h2><p>This code expires in 10 minutes.</p>`,
  });
}

async function sendTicketEmail(to, { eventName, seatLabel, qrDataUrl, status }) {
  const seatLine = seatLabel
    ? `<p><b>Seat:</b> ${seatLabel}</p>`
    : `<p>You are currently on the <b>waitlist</b>. We'll email you if a seat opens up.</p>`;

  await sendEmail({
    to,
    subject: `Your registration for ${eventName} - ${status}`,
    html: `
      <h2>${eventName}</h2>
      <p><b>Status:</b> ${status}</p>
      ${seatLine}
      ${qrDataUrl ? `<p>Show this QR code at the entrance:</p><img src="${qrDataUrl}" alt="Ticket QR" />` : ''}
    `,
  });
}

module.exports = { sendEmail, sendOtpEmail, sendTicketEmail };
