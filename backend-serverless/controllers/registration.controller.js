const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { registerForEvent, cancelRegistration } = require('../services/seat.service');
const { generateQrDataUrl } = require('../services/qr.service');
const { sendTicketEmail } = require('../services/email.service');

// POST /api/events/:id/register   (STUDENT)
const register = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  const { rows: meRows } = await pool.query('SELECT email_verified, email, name FROM users WHERE id = $1', [req.user.id]);
  const me = meRows[0];
  if (!me.email_verified) {
    throw new ApiError(403, 'Please verify your college email before registering for an event');
  }

  const result = await registerForEvent(eventId, req.user);

  const qrDataUrl = result.status === 'CONFIRMED' ? await generateQrDataUrl(result.token) : null;

  sendTicketEmail(me.email, {
    eventName: result.eventName,
    seatLabel: result.seatLabel,
    qrDataUrl,
    status: result.status,
  }).catch((e) => console.error('Failed to send ticket email:', e.message));

  res.status(201).json({
    registrationId: result.registrationId,
    status: result.status,
    seatLabel: result.seatLabel,
    qrDataUrl,
  });
});

// DELETE /api/registrations/:id   (STUDENT - own only, or ADMIN)
const cancel = asyncHandler(async (req, res) => {
  const { promoted } = await cancelRegistration(req.params.id, req.user);

  if (promoted) {
    const qrDataUrl = await generateQrDataUrl(promoted.token);
    sendTicketEmail(promoted.email, {
      eventName: promoted.eventName,
      seatLabel: promoted.seatLabel,
      qrDataUrl,
      status: 'CONFIRMED (promoted from waitlist)',
    }).catch((e) => console.error('Failed to send promotion email:', e.message));
  }

  res.json({
    message: 'Registration cancelled',
    promotedStudent: promoted ? { name: promoted.name, seatLabel: promoted.seatLabel } : null,
  });
});

// GET /api/events/:id/registrations?status=CONFIRMED|WAITLISTED|CANCELLED   (ADMIN)
const listForEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.query;

  const params = [id];
  let where = 'r.event_id = $1';
  if (status) {
    params.push(status);
    where += ` AND r.status = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT r.id, r.status, r.registered_at,
            u.name, u.roll_no, u.department, u.email,
            s.section, s.row_label, s.seat_number,
            t.status AS ticket_status, t.used_at
     FROM registrations r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN seats s ON s.id = r.seat_id
     LEFT JOIN tickets t ON t.registration_id = r.id AND t.status != 'CANCELLED'
     WHERE ${where}
     ORDER BY r.registered_at ASC`,
    params
  );

  res.json(
    rows.map((r) => ({
      registrationId: r.id,
      status: r.status,
      registeredAt: r.registered_at,
      name: r.name,
      rollNo: r.roll_no,
      department: r.department,
      email: r.email,
      seatLabel: r.section ? `${r.section}${r.row_label}-${r.seat_number}` : null,
      checkedIn: r.ticket_status === 'USED',
      checkedInAt: r.used_at,
    }))
  );
});

// GET /api/events/:id/registrations/export   (ADMIN) - CSV download
const exportCsv = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await pool.query(
    `SELECT u.name, u.roll_no, u.department, u.email, r.status,
            s.section, s.row_label, s.seat_number, r.registered_at,
            t.status AS ticket_status
     FROM registrations r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN seats s ON s.id = r.seat_id
     LEFT JOIN tickets t ON t.registration_id = r.id AND t.status != 'CANCELLED'
     WHERE r.event_id = $1
     ORDER BY r.registered_at ASC`,
    [id]
  );

  const header = 'Name,RollNo,Department,Email,Status,Seat,RegisteredAt,CheckedIn\n';
  const body = rows
    .map((r) => {
      const seat = r.section ? `${r.section}${r.row_label}-${r.seat_number}` : '';
      const checkedIn = r.ticket_status === 'USED' ? 'YES' : 'NO';
      return [r.name, r.roll_no, r.department || '', r.email, r.status, seat, r.registered_at, checkedIn]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
    })
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="event-${id}-registrations.csv"`);
  res.send(header + body);
});

module.exports = { register, cancel, listForEvent, exportCsv };
