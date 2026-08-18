const QRCode = require('qrcode');

// Encodes ONLY the opaque token in the QR - never name/roll/seat (section 11).
// Returns a base64 data URL the frontend can drop straight into an <img src>.
async function generateQrDataUrl(token) {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
}

module.exports = { generateQrDataUrl };
