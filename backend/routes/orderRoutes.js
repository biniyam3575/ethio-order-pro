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
  getUnreadNotifications,
  markNotificationAsRead,
} = require('../controllers/orderController');


/*
|--------------------------------------------------------------------------
| ORDER ROUTES
|--------------------------------------------------------------------------
*/

/*
 * Create a new order
 */
router.post(
  '/',
  authenticateToken,
  createOrder
);


/*
 * Kitchen orders
 */
router.get(
  '/kitchen',
  authenticateToken,
  getKitchenOrders
);


/*
 * Live orders
 */
router.get(
  '/live',
  authenticateToken,
  getLiveOrders
);


/*
 * Request bill
 *
 * Only a Waiter can request the bill.
 *
 * The order must already be in "Served" status.
 */
router.post(
  '/:orderId/request-bill',
  authenticateToken,
  requireRole(['Waiter']),
  requestBill
);


/*
 * Update order status
 *
 * Kept for Kitchen/order status operations.
 */
router.put(
  '/:orderId/status',
  authenticateToken,
  updateOrderStatus
);


/*
|--------------------------------------------------------------------------
| NOTIFICATION ROUTES
|--------------------------------------------------------------------------
*/

/*
 * Get unread notifications
 */
router.get(
  '/notifications',
  authenticateToken,
  getUnreadNotifications
);


/*
 * Mark a notification as read
 */
router.put(
  '/notifications/:notificationId/read',
  authenticateToken,
  markNotificationAsRead
);


module.exports = router;