const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { openShift, closeShift, getCurrentShift, getAllShifts } = require('../controllers/shiftController');

router.post('/open', authenticateToken, requireRole(['Cashier']), openShift);
router.post('/close', authenticateToken, requireRole(['Cashier']), closeShift);
router.get('/current', authenticateToken, requireRole(['Cashier']), getCurrentShift);
router.get('/all', authenticateToken, requireRole(['Manager', 'General Manager', 'Owner']), getAllShifts);

module.exports = router;