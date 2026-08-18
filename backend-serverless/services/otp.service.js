const pool = require('../db/pool');
const { sendOtpEmail } = require('./email.service');

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

async function requestOtp(email) {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await pool.query(
    'INSERT INTO email_otps (email, otp_code, expires_at) VALUES ($1, $2, $3)',
    [email, otp, expiresAt]
  );

  await sendOtpEmail(email, otp);
}

async function verifyOtp(email, otp) {
  const { rows } = await pool.query(
    `SELECT id FROM email_otps
     WHERE email = $1 AND otp_code = $2 AND verified = FALSE AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [email, otp]
  );

  if (rows.length === 0) return false;

  await pool.query('UPDATE email_otps SET verified = TRUE WHERE id = $1', [rows[0].id]);
  await pool.query('UPDATE users SET email_verified = TRUE WHERE email = $1', [email]);
  return true;
}

module.exports = { requestOtp, verifyOtp };
