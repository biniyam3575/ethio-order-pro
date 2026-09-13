const express = require('express');
const router = express.Router();
const { 
  getSalesSummary, 
  getStationReconciliation 
} = require('../controllers/reportController');
const { authenticateToken, requireManager } = require('../middleware/auth');

// Protect all report endpoints for Manager/Owner access
router.use(authenticateToken, requireManager);

// Core Sales Analytics
router.get('/summary', getSalesSummary);

// Kitchen/Bar/Hot Drinks Production vs. Cashier Collections
router.get('/station-reconciliation', getStationReconciliation);

module.exports = router;