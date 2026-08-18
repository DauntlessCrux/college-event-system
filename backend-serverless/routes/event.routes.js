const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const ctrl = require('../controllers/event.controller');
const regCtrl = require('../controllers/registration.controller');

router.get('/', optionalAuth, ctrl.listEvents);
router.post('/', requireAuth, requireRole('ADMIN'), ctrl.createEvent);
router.get('/:id', optionalAuth, ctrl.getEvent);
router.put('/:id', requireAuth, requireRole('ADMIN'), ctrl.updateEvent);
router.patch('/:id/status', requireAuth, requireRole('ADMIN'), ctrl.setEventStatus);

// Registration sub-resources
router.post('/:id/register', requireAuth, requireRole('STUDENT'), regCtrl.register);
router.get('/:id/registrations', requireAuth, requireRole('ADMIN'), regCtrl.listForEvent);
router.get('/:id/registrations/export', requireAuth, requireRole('ADMIN'), regCtrl.exportCsv);

module.exports = router;
