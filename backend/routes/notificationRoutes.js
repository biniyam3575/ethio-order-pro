const express = require('express');

const router = express.Router();
const {
  authenticateToken,
} = require('../middleware/auth');

const {
    getUnreadNotifications,
    markNotificationAsRead,
} = require('../controllers/notificationController')

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