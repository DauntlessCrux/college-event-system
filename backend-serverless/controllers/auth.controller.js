const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const otpService = require('../services/otp.service');

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/signup  (students only - admin/scanner accounts are seeded)
const signup = asyncHandler(async (req, res) => {
  const { name, email, rollNo, department, year, phone, password } = req.body;

  if (!name || !email || !rollNo || !password) {
    throw new ApiError(400, 'name, email, rollNo and password are required');
  }

  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
  if (allowedDomain && !email.toLowerCase().endsWith(allowedDomain.toLowerCase())) {
    throw new ApiError(400, `Please use your college email ending in ${allowedDomain}`);
  }

  const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1 OR roll_no = $2', [email, rollNo]);
  if (existing.length > 0) {
    throw new ApiError(409, 'An account with this email or roll number already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, roll_no, department, year, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'STUDENT') RETURNING id`,
    [name, email, rollNo, department || null, year || null, phone || null, passwordHash]
  );

  await otpService.requestOtp(email);

  res.status(201).json({
    message: 'Account created. Check your email for a verification code.',
    userId: rows[0].id,
  });
});

// POST /api/auth/request-otp  { email }
const requestOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'email is required');

  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows.length === 0) throw new ApiError(404, 'No account with that email');

  await otpService.requestOtp(email);
  res.json({ message: 'Verification code sent' });
});

// POST /api/auth/verify-otp  { email, otp }
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, 'email and otp are required');

  const ok = await otpService.verifyOtp(email, otp);
  if (!ok) throw new ApiError(400, 'Invalid or expired code');

  res.json({ message: 'Email verified successfully' });
});

// POST /api/auth/login  { email, password }
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'email and password are required');

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new ApiError(401, 'Invalid email or password');

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      rollNo: user.roll_no,
      emailVerified: !!user.email_verified,
    },
  });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, roll_no, department, year, role, email_verified FROM users WHERE id = $1',
    [req.user.id]
  );
  if (rows.length === 0) throw new ApiError(404, 'User not found');
  res.json(rows[0]);
});

module.exports = { signup, login, requestOtp, verifyOtp, me };
