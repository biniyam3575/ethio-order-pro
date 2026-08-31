const express = require('express');

const router = express.Router();

const {
  authenticateToken,
  requireRole,
} = require('../middleware/auth');

const { 
  getAwaitingBillOrders,
  processPayment,
} = require('../controllers/billingController');

router.get(
  '/awaiting-bill',
  authenticateToken,
  requireRole(['Cashier', 'Manager']),
  getAwaitingBillOrders
);

router.post(
  '/:orderId/pay',
  authenticateToken,
  requireRole(['Cashier', 'Manager']),
  processPayment
);
module.exports = router;