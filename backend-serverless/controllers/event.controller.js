const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { generateSeatsForEvent } = require('../services/seat.service');

const RESERVED_CATEGORIES = ['GUEST', 'FACULTY', 'MANAGEMENT', 'ORGANIZER'];

// POST /api/events   (ADMIN)
const createEvent = asyncHandler(async (req, res) => {
  const {
    name, description, venue, eventDate,
    registrationStart, registrationEnd, totalCapacity, reserved = {},
  } = req.body;

  if (!name || !eventDate || !registrationStart || !registrationEnd || !totalCapacity) {
    throw new ApiError(400, 'name, eventDate, registrationStart, registrationEnd and totalCapacity are required');
  }

  const reservedTotal = RESERVED_CATEGORIES.reduce((sum, cat) => sum + (Number(reserved[cat]) || 0), 0);
  const studentCapacity = Number(totalCapacity) - reservedTotal;

  if (studentCapacity < 0) {
    throw new ApiError(400, 'Reserved seats exceed total capacity');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO events (name, description, venue, event_date, capacity,
         registration_start, registration_end, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', $8) RETURNING id`,
      [name, description || null, venue || null, eventDate, totalCapacity,
        registrationStart, registrationEnd, req.user.id]
    );

    const eventId = rows[0].id;

    const breakdown = { STUDENT: studentCapacity };
    for (const cat of RESERVED_CATEGORIES) {
      breakdown[cat] = Number(reserved[cat]) || 0;
    }

    await generateSeatsForEvent(client, eventId, breakdown);
    await client.query('COMMIT');

    res.status(201).json({
      id: eventId,
      studentCapacity,
      reserved: breakdown,
      message: 'Event created with seats generated. Registration status is DRAFT until you open it.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// GET /api/events  (public - students only see OPEN/CLOSED, admins see everything)
const listEvents = asyncHandler(async (req, res) => {
  const isAdmin = req.user && req.user.role === 'ADMIN';

  const { rows: events } = await pool.query(
    isAdmin
      ? 'SELECT * FROM events ORDER BY event_date DESC'
      : `SELECT * FROM events WHERE status IN ('OPEN','CLOSED') ORDER BY event_date DESC`
  );

  if (events.length === 0) return res.json([]);

  const eventIds = events.map((e) => e.id);
  const { rows: seatCounts } = await pool.query(
    `SELECT event_id, category,
            COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS available,
            COUNT(*) AS total
     FROM seats WHERE event_id = ANY($1::int[]) GROUP BY event_id, category`,
    [eventIds]
  );

  const byEvent = {};
  for (const row of seatCounts) {
    byEvent[row.event_id] = byEvent[row.event_id] || {};
    byEvent[row.event_id][row.category] = { available: Number(row.available), total: Number(row.total) };
  }

  res.json(
    events.map((e) => ({
      ...e,
      seatBreakdown: byEvent[e.id] || {},
      studentSeatsAvailable: byEvent[e.id]?.STUDENT?.available ?? 0,
      studentSeatsTotal: byEvent[e.id]?.STUDENT?.total ?? 0,
    }))
  );
});

// GET /api/events/:id
const getEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  const event = rows[0];
  if (!event) throw new ApiError(404, 'Event not found');

  const { rows: seatCounts } = await pool.query(
    `SELECT category,
            COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS available,
            COUNT(*) AS total
     FROM seats WHERE event_id = $1 GROUP BY category`,
    [id]
  );
  const seatBreakdown = {};
  for (const row of seatCounts) {
    seatBreakdown[row.category] = { available: Number(row.available), total: Number(row.total) };
  }

  let myRegistration = null;
  if (req.user) {
    const { rows: regRows } = await pool.query(
      'SELECT id, status, seat_id FROM registrations WHERE event_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    myRegistration = regRows[0] || null;
  }

  res.json({ ...event, seatBreakdown, myRegistration });
});

// PATCH /api/events/:id/status   (ADMIN)
const setEventStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'];
  if (!valid.includes(status)) throw new ApiError(400, `status must be one of ${valid.join(', ')}`);

  const result = await pool.query('UPDATE events SET status = $1 WHERE id = $2', [status, id]);
  if (result.rowCount === 0) throw new ApiError(404, 'Event not found');

  res.json({ message: `Event status set to ${status}` });
});

// PUT /api/events/:id   (ADMIN)
const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, venue, eventDate, registrationStart, registrationEnd } = req.body;

  const result = await pool.query(
    `UPDATE events SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       venue = COALESCE($3, venue),
       event_date = COALESCE($4, event_date),
       registration_start = COALESCE($5, registration_start),
       registration_end = COALESCE($6, registration_end)
     WHERE id = $7`,
    [name, description, venue, eventDate, registrationStart, registrationEnd, id]
  );
  if (result.rowCount === 0) throw new ApiError(404, 'Event not found');

  res.json({ message: 'Event updated' });
});

module.exports = { createEvent, listEvents, getEvent, setEventStatus, updateEvent };
