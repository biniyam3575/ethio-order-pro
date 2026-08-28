
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
 * Update order status
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
 *
 * The authentication middleware decodes the JWT
 * and puts the user information into req.user.
 */
router.get(
  '/notifications',
  authenticateToken,
  getUnreadNotifications
);

/*
 * Mark a notification as read
 *
 * IMPORTANT:
 * authenticateToken must run BEFORE markNotificationAsRead
 * so that req.user.staff_id exists.
 */
router.put(
  '/notifications/:notificationId/read',
  authenticateToken,
  markNotificationAsRead
);

module.exports = router;

