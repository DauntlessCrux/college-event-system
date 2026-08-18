const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/registration.controller');

// STUDENT can cancel their own registration; ADMIN can cancel anyone's
// (role check for "own registration" happens inside the service layer).
router.delete('/:id', requireAuth, ctrl.cancel);

module.exports = router;
