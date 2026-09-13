const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');

const {
  createOrder,
  getKitchenOrders,
  getLiveOrders,
  updateOrderStatus,
  requestBill,
  cancelOrder,
  cancelOrderItem,
  dismissStationOrder,
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
| ORDER MANAGEMENT ROUTES
|--------------------------------------------------------------------------
*/
router.post('/station/dismiss', authenticateToken, dismissStationOrder);

// Create a new order
router.post('/', authenticateToken, createOrder);

// Fetch orders by production station (Kitchen, Bar, Hot Drinks)
router.get('/kitchen', authenticateToken, getKitchenOrders);

// Fetch live orders for assigned waiter
router.get('/live', authenticateToken, getLiveOrders);

// Request bill for a served order (Waiter only)
router.post(
  '/:orderId/request-bill',
  authenticateToken,
  requireRole(['Waiter']),
  requestBill
);

// Cashier view for pending bills
router.get(
  '/awaiting-bill',
  authenticateToken,
  requireRole(['Cashier', 'General Manager', 'Owner']),
  getAwaitingBillOrders
);

// Cashier payment execution
router.post(
  '/:orderId/pay',
  authenticateToken,
  requireRole(['Cashier', 'General Manager', 'Owner']),
  processPayment
);

// Cancel an entire order ticket
router.put(
  '/:orderId/cancel',
  authenticateToken,
  requireRole(['Waiter', 'General Manager', 'Owner']),
  cancelOrder
);

// 2. Cancel a single line item within an order ticket
router.put(
  '/:orderId/items/:itemId/cancel',
  authenticateToken,
  requireRole(['Waiter', 'General Manager', 'Owner']),
  cancelOrderItem
);

// Notification endpoints
router.get('/notifications', authenticateToken, getUnreadNotifications);
router.put('/notifications/:notificationId/read', authenticateToken, markNotificationAsRead);

// Station item status update endpoint (e.g. marking item Ready)
router.put('/item/:orderItemId/status', authenticateToken, updateOrderStatus);

module.exports = router;