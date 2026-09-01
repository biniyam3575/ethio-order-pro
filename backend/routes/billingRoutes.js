const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getAwaitingBillOrders, processPayment } = require('../controllers/billingController');

router.get(
  '/awaiting-bill',
  authenticateToken,
  requireRole(['Cashier', 'Manager', 'General Manager', 'Owner']),
  getAwaitingBillOrders
);

router.post(
  '/process-table-payment',
  authenticateToken,
  requireRole(['Cashier', 'Manager', 'General Manager', 'Owner']),
  processPayment
);

module.exports = router;