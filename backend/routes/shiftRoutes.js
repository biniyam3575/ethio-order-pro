const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { 
  openShift, 
  closeShift, 
  getCurrentShift, 
  getActiveShifts, 
  getAllShifts, 
  forceCloseShift 
} = require('../controllers/shiftController');

// Cashier Operations
router.post('/open', authenticateToken, requireRole(['Cashier']), openShift);
router.post('/close', authenticateToken, requireRole(['Cashier']), closeShift);
router.get('/current', authenticateToken, requireRole(['Cashier']), getCurrentShift);

// Manager & Owner Control Operations
router.get('/active-all', authenticateToken, requireRole(['Manager', 'General Manager', 'Owner']), getActiveShifts);
router.get('/history', authenticateToken, requireRole(['Manager', 'General Manager', 'Owner']), getAllShifts);
router.post('/force-close/:shiftId', authenticateToken, requireRole(['Manager', 'General Manager', 'Owner']), forceCloseShift);

module.exports = router;