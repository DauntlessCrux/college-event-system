const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

// GET /api/admin/dashboard/:eventId
const dashboard = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const { rows: eventRows } = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
  const event = eventRows[0];
  if (!event) throw new ApiError(404, 'Event not found');

  const { rows: seatCounts } = await pool.query(
    `SELECT category,
            COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS available,
            COUNT(*) AS total
     FROM seats WHERE event_id = $1 GROUP BY category`,
    [eventId]
  );

  const { rows: regCountRows } = await pool.query(
    `SELECT
        COUNT(*) FILTER (WHERE status = 'CONFIRMED')  AS confirmed,
        COUNT(*) FILTER (WHERE status = 'WAITLISTED') AS waitlisted,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')  AS cancelled
     FROM registrations WHERE event_id = $1`,
    [eventId]
  );
  const regCounts = regCountRows[0];

  const { rows: checkInRows } = await pool.query(
    `SELECT COUNT(*) AS checked_in
     FROM check_ins ci
     JOIN tickets t ON t.id = ci.ticket_id
     JOIN registrations r ON r.id = t.registration_id
     WHERE r.event_id = $1`,
    [eventId]
  );
  const checkInCounts = checkInRows[0];

  const reserved = {};
  let studentSeats = { available: 0, total: 0 };
  for (const row of seatCounts) {
    if (row.category === 'STUDENT') {
      studentSeats = { available: Number(row.available), total: Number(row.total) };
    } else {
      reserved[row.category] = { available: Number(row.available), total: Number(row.total) };
    }
  }

  res.json({
    event: { id: event.id, name: event.name, status: event.status, capacity: event.capacity },
    studentSeats,
    reserved,
    confirmed: Number(regCounts.confirmed) || 0,
    waitlisted: Number(regCounts.waitlisted) || 0,
    cancelled: Number(regCounts.cancelled) || 0,
    checkedIn: Number(checkInCounts.checked_in) || 0,
  });
});

// GET /api/admin/waitlist/:eventId
const waitlist = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { rows } = await pool.query(
    `SELECT r.id AS registration_id, r.registered_at, u.name, u.roll_no, u.email,
            (SELECT COUNT(*) FROM registrations r2
             WHERE r2.event_id = r.event_id AND r2.status = 'WAITLISTED'
               AND r2.registered_at < r.registered_at) + 1 AS position
     FROM registrations r
     JOIN users u ON u.id = r.user_id
     WHERE r.event_id = $1 AND r.status = 'WAITLISTED'
     ORDER BY r.registered_at ASC`,
    [eventId]
  );
  res.json(rows);
});

// POST /api/admin/staff   { name, email, password, role }  role: ADMIN | SCANNER
const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !['ADMIN', 'SCANNER'].includes(role)) {
    throw new ApiError(400, 'name, email, password and role (ADMIN or SCANNER) are required');
  }

  const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.length > 0) throw new ApiError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, email_verified) VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
    [name, email, passwordHash, role]
  );

  res.status(201).json({ id: rows[0].id, message: `${role} account created` });
});

module.exports = { dashboard, waitlist, createStaff };
