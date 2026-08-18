const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/ticket.controller');

router.get('/me', requireAuth, requireRole('STUDENT'), ctrl.getMyTickets);
router.post('/verify', requireAuth, requireRole('SCANNER', 'ADMIN'), ctrl.verifyTicket);

module.exports = router;
