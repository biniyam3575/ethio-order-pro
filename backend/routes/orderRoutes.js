
const express = require('express');

const router = express.Router();

const {
  authenticateToken,
  requireRole,
} = require('../middleware/auth');

const {
  createOrder,
  getKitchenOrders,
  getLiveOrders,
  updateOrderStatus,
  requestBill,
} = require('../controllers/orderController');

const {
  getAwaitingBillOrders,
  processPayment,
} = require('../controllers/billingController');

const {
  getUnreadNotifications,
  markNotificationAsRead,
} = require('../controllers/notificationController');


/*
|--------------------------------------------------------------------------
| CREATE ORDER
|--------------------------------------------------------------------------
*/

router.post(
  '/',
  authenticateToken,
  createOrder
);


/*
|--------------------------------------------------------------------------
| KITCHEN ORDERS
|--------------------------------------------------------------------------
*/

router.get(
  '/kitchen',
  authenticateToken,
  getKitchenOrders
);


/*
|--------------------------------------------------------------------------
| LIVE ORDERS
|--------------------------------------------------------------------------
*/

router.get(
  '/live',
  authenticateToken,
  getLiveOrders
);


/*
|--------------------------------------------------------------------------
| REQUEST BILL
|--------------------------------------------------------------------------
|
| Flow:
|
| Served
|   ↓
| Awaiting_Bill
|   ↓
| Cashier
|
| Only the waiter can request the bill.
|
*/

router.post(
  '/:orderId/request-bill',
  authenticateToken,
  requireRole(['Waiter']),
  requestBill
);


/*
|--------------------------------------------------------------------------
| CASHIER - AWAITING BILL
|--------------------------------------------------------------------------
|
| GET /api/v1/orders/awaiting-bill
|
| Cashiers and Managers can see orders waiting for payment.
|
*/

router.get(
  '/awaiting-bill',
  authenticateToken,
  requireRole(['Cashier', 'Manager']),
  getAwaitingBillOrders
);


/*
|--------------------------------------------------------------------------
| CASHIER - PROCESS PAYMENT
|--------------------------------------------------------------------------
|
| POST /api/v1/orders/:orderId/pay
|
| Cashier or Manager finalizes payment.
|
*/

router.post(
  '/:orderId/pay',
  authenticateToken,
  requireRole(['Cashier', 'Manager']),
  processPayment
);


/*
|--------------------------------------------------------------------------
| NOTIFICATIONS
|--------------------------------------------------------------------------
*/

router.get(
  '/notifications',
  authenticateToken,
  getUnreadNotifications
);

router.put(
  '/notifications/:notificationId/read',
  authenticateToken,
  markNotificationAsRead
);


/*
|--------------------------------------------------------------------------
| UPDATE ORDER STATUS
|--------------------------------------------------------------------------
|
| Used by Kitchen / other authorized order operations.
|
*/

router.put(
  '/:orderId/status',
  authenticateToken,
  updateOrderStatus
);


module.exports = router;

