const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/admin.controller');

router.get('/dashboard/:eventId', requireAuth, requireRole('ADMIN'), ctrl.dashboard);
router.get('/waitlist/:eventId', requireAuth, requireRole('ADMIN'), ctrl.waitlist);
router.post('/staff', requireAuth, requireRole('ADMIN'), ctrl.createStaff);

module.exports = router;
