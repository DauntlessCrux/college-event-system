const crypto = require('crypto');

// Opaque, unguessable ticket token. This is what goes INSIDE the QR code.
// It carries no readable information about the student, seat, or event -
// the server is the only thing that can resolve it (see section 12 of the
// brief: "the system should not trust the QR itself").
function generateTicketToken() {
  return crypto.randomBytes(24).toString('hex'); // 48 hex chars
}

module.exports = { generateTicketToken };
