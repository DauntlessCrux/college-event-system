const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { verifyAndUseTicket } = require('../services/seat.service');
const { generateQrDataUrl } = require('../services/qr.service');

// GET /api/tickets/me  - every ticket the logged-in student holds, with QR
const getMyTickets = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id AS registration_id, r.status AS reg_status, r.event_id,
            e.name AS event_name, e.venue, e.event_date,
            s.section, s.row_label, s.seat_number,
            t.token, t.status AS ticket_status
     FROM registrations r
     JOIN events e ON e.id = r.event_id
     LEFT JOIN seats s ON s.id = r.seat_id
     LEFT JOIN tickets t ON t.registration_id = r.id AND t.status != 'CANCELLED'
     WHERE r.user_id = $1 AND r.status != 'CANCELLED'
     ORDER BY e.event_date DESC`,
    [req.user.id]
  );

  const results = await Promise.all(
    rows.map(async (r) => ({
      registrationId: r.registration_id,
      eventId: r.event_id,
      eventName: r.event_name,
      venue: r.venue,
      eventDate: r.event_date,
      status: r.reg_status,
      seatLabel: r.section ? `${r.section}${r.row_label}-${r.seat_number}` : null,
      ticketStatus: r.ticket_status,
      qrDataUrl:
        r.reg_status === 'CONFIRMED' && r.ticket_status === 'ACTIVE' && r.token
          ? await generateQrDataUrl(r.token)
          : null,
    }))
  );

  res.json(results);
});

// POST /api/tickets/verify   (SCANNER, ADMIN)   body: { token }
const verifyTicket = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'token is required');

  const result = await verifyAndUseTicket(token, req.user.id);
  res.json(result);
});

module.exports = { getMyTickets, verifyTicket };
