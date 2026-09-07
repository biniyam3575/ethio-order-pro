const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getAwaitingBillOrders, processPayment, getPaymentHistory } = require('../controllers/billingController');

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

router.get(
  '/history',
  authenticateToken,
  requireRole(['Cashier', 'Manager', 'General Manager', 'Owner']),
  getPaymentHistory
);

module.exports = router;