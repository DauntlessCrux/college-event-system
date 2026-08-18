const pool = require('../db/pool');
const { ApiError } = require('../middleware/errorHandler');
const { generateTicketToken } = require('../utils/token');

const SEATS_PER_ROW = 20;
const SECTION_CODE = {
  STUDENT: 'ST',
  GUEST: 'GU',
  FACULTY: 'FA',
  MANAGEMENT: 'MG',
  ORGANIZER: 'OR',
};

function seatLabelOf(seat) {
  if (!seat) return null;
  return `${seat.section}${seat.row_label}-${seat.seat_number}`;
}

/**
 * Bulk-creates every physical seat for an event, split by category.
 * Must be called with an active `client` (pool.connect()), inside the same
 * transaction as the INSERT INTO events, so event + seats commit together.
 * node-postgres has no mysql2-style "VALUES ?" shorthand, so this builds one
 * parameterized multi-row INSERT by hand.
 */
async function generateSeatsForEvent(client, eventId, breakdown) {
  const rows = [];
  for (const [category, count] of Object.entries(breakdown)) {
    const n = Number(count) || 0;
    if (n <= 0) continue;
    const section = SECTION_CODE[category] || category.slice(0, 2).toUpperCase();
    for (let i = 1; i <= n; i++) {
      const row = Math.ceil(i / SEATS_PER_ROW);
      const seatNumber = ((i - 1) % SEATS_PER_ROW) + 1;
      rows.push([eventId, section, String(row), seatNumber, category]);
    }
  }
  if (rows.length === 0) return;

  const values = [];
  const placeholders = rows.map((r, i) => {
    const base = i * 5;
    values.push(...r);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
  });

  await client.query(
    `INSERT INTO seats (event_id, section, row_label, seat_number, category) VALUES ${placeholders.join(', ')}`,
    values
  );
}

/**
 * FCFS registration with concurrency-safe seat allocation.
 * SELECT ... FOR UPDATE SKIP LOCKED works the same way in Postgres as in
 * MySQL 8 - two concurrent requests never race for the same seat row, and
 * never both "see" the same last-remaining seat (section 15 of the brief).
 */
async function registerForEvent(eventId, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: eventRows } = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    const event = eventRows[0];
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.status !== 'OPEN') throw new ApiError(400, 'Registration is not open for this event');

    const now = new Date();
    if (now < new Date(event.registration_start)) throw new ApiError(400, 'Registration has not started yet');
    if (now > new Date(event.registration_end)) throw new ApiError(400, 'Registration is closed');

    // App-level uniqueness so a CANCELLED row can be reused instead of
    // permanently blocking the (event_id, user_id) unique constraint.
    const { rows: existingRows } = await client.query(
      'SELECT * FROM registrations WHERE event_id = $1 AND user_id = $2 FOR UPDATE',
      [eventId, user.id]
    );
    const existing = existingRows[0];
    if (existing && existing.status !== 'CANCELLED') {
      throw new ApiError(409, `You are already registered for this event (status: ${existing.status})`);
    }

    // SKIP LOCKED: a concurrent request already looking at a different
    // available seat never blocks on this one, and vice versa - true FCFS
    // under load.
    const { rows: seatRows } = await client.query(
      `SELECT id, section, row_label, seat_number FROM seats
       WHERE event_id = $1 AND category = 'STUDENT' AND status = 'AVAILABLE'
       ORDER BY id ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
      [eventId]
    );

    const seat = seatRows[0] || null;
    const status = seat ? 'CONFIRMED' : 'WAITLISTED';

    if (seat) {
      await client.query("UPDATE seats SET status = 'ASSIGNED' WHERE id = $1", [seat.id]);
    }

    let registrationId;
    if (existing) {
      await client.query(
        'UPDATE registrations SET seat_id = $1, status = $2, registered_at = NOW() WHERE id = $3',
        [seat ? seat.id : null, status, existing.id]
      );
      registrationId = existing.id;
    } else {
      const { rows: insertRows } = await client.query(
        'INSERT INTO registrations (event_id, user_id, seat_id, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [eventId, user.id, seat ? seat.id : null, status]
      );
      registrationId = insertRows[0].id;
    }

    // Retire any stale ticket from a previous cancel/re-register cycle,
    // then issue a fresh one-time token.
    await client.query(
      "UPDATE tickets SET status = 'CANCELLED' WHERE registration_id = $1 AND status = 'ACTIVE'",
      [registrationId]
    );
    const token = generateTicketToken();
    await client.query(
      "INSERT INTO tickets (registration_id, token, status) VALUES ($1, $2, 'ACTIVE')",
      [registrationId, token]
    );

    await client.query('COMMIT');

    return {
      registrationId,
      status,
      seatLabel: seatLabelOf(seat),
      token,
      eventName: event.name,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Cancels a registration. If it held a CONFIRMED seat, the seat is freed
 * and the earliest WAITLISTED registration for the same event is promoted
 * in the same transaction (queue semantics - section 8 of the brief).
 */
async function cancelRegistration(registrationId, requestingUser) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: regRows } = await client.query('SELECT * FROM registrations WHERE id = $1 FOR UPDATE', [registrationId]);
    const reg = regRows[0];
    if (!reg) throw new ApiError(404, 'Registration not found');

    if (requestingUser.role === 'STUDENT' && reg.user_id !== requestingUser.id) {
      throw new ApiError(403, 'You can only cancel your own registration');
    }
    if (reg.status === 'CANCELLED') {
      throw new ApiError(400, 'This registration is already cancelled');
    }

    const wasConfirmed = reg.status === 'CONFIRMED';
    const freedSeatId = reg.seat_id;

    await client.query("UPDATE registrations SET status = 'CANCELLED', seat_id = NULL WHERE id = $1", [registrationId]);
    await client.query(
      "UPDATE tickets SET status = 'CANCELLED' WHERE registration_id = $1 AND status = 'ACTIVE'",
      [registrationId]
    );

    let promoted = null;

    if (wasConfirmed && freedSeatId) {
      await client.query("UPDATE seats SET status = 'AVAILABLE' WHERE id = $1", [freedSeatId]);

      const { rows: waitlistRows } = await client.query(
        `SELECT * FROM registrations WHERE event_id = $1 AND status = 'WAITLISTED'
         ORDER BY registered_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
        [reg.event_id]
      );
      const nextInLine = waitlistRows[0];

      if (nextInLine) {
        await client.query("UPDATE seats SET status = 'ASSIGNED' WHERE id = $1", [freedSeatId]);
        await client.query(
          "UPDATE registrations SET status = 'CONFIRMED', seat_id = $1 WHERE id = $2",
          [freedSeatId, nextInLine.id]
        );

        await client.query(
          "UPDATE tickets SET status = 'CANCELLED' WHERE registration_id = $1 AND status = 'ACTIVE'",
          [nextInLine.id]
        );
        const token = generateTicketToken();
        await client.query(
          "INSERT INTO tickets (registration_id, token, status) VALUES ($1, $2, 'ACTIVE')",
          [nextInLine.id, token]
        );

        const { rows: seatFullRows } = await client.query(
          'SELECT section, row_label, seat_number FROM seats WHERE id = $1',
          [freedSeatId]
        );
        const { rows: userRows } = await client.query('SELECT id, name, email FROM users WHERE id = $1', [nextInLine.user_id]);
        const { rows: eventRows2 } = await client.query('SELECT name FROM events WHERE id = $1', [reg.event_id]);

        promoted = {
          userId: userRows[0].id,
          email: userRows[0].email,
          name: userRows[0].name,
          eventName: eventRows2[0].name,
          seatLabel: seatLabelOf(seatFullRows[0]),
          token,
        };
      }
    }

    await client.query('COMMIT');
    return { promoted };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Atomically validates and "burns" a QR ticket at the gate. FOR UPDATE OF t
 * locks just the ticket row; a second scanner hitting the exact same token
 * while this transaction is in flight simply waits, then correctly sees
 * USED - no double entry, per section 16.
 */
async function verifyAndUseTicket(token, scannerId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT t.id AS ticket_id, t.status AS ticket_status, t.used_at,
              r.id AS registration_id, r.status AS reg_status, r.seat_id, r.event_id, r.user_id
       FROM tickets t
       JOIN registrations r ON r.id = t.registration_id
       WHERE t.token = $1
       FOR UPDATE OF t`,
      [token]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'INVALID', message: 'Invalid ticket - this QR code is not recognized' };
    }

    const t = rows[0];

    if (t.reg_status === 'CANCELLED' || t.ticket_status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'CANCELLED', message: 'This ticket has been cancelled' };
    }

    if (t.ticket_status === 'USED') {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'ALREADY_USED', message: 'Ticket already used', usedAt: t.used_at };
    }

    const updateResult = await client.query(
      "UPDATE tickets SET status = 'USED', used_at = NOW() WHERE id = $1 AND status = 'ACTIVE'",
      [t.ticket_id]
    );

    if (updateResult.rowCount === 0) {
      // Lost the race to another concurrent scan of the same QR.
      await client.query('ROLLBACK');
      return { ok: false, reason: 'ALREADY_USED', message: 'Ticket already used' };
    }

    await client.query('INSERT INTO check_ins (ticket_id, scanner_id) VALUES ($1, $2)', [t.ticket_id, scannerId]);

    const { rows: studentRows } = await client.query('SELECT name, roll_no, department FROM users WHERE id = $1', [t.user_id]);
    const { rows: eventRows3 } = await client.query('SELECT name FROM events WHERE id = $1', [t.event_id]);
    let seatLabel = null;
    if (t.seat_id) {
      const { rows: seatRows2 } = await client.query('SELECT section, row_label, seat_number FROM seats WHERE id = $1', [t.seat_id]);
      seatLabel = seatLabelOf(seatRows2[0]);
    }

    await client.query('COMMIT');
    return { ok: true, student: studentRows[0], eventName: eventRows3[0].name, seatLabel };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  generateSeatsForEvent,
  registerForEvent,
  cancelRegistration,
  verifyAndUseTicket,
  seatLabelOf,
};
