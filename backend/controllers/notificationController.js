const { pool } = require('../config/db');

/*
|--------------------------------------------------------------------------
| GET UNREAD NOTIFICATIONS
|--------------------------------------------------------------------------
*/
const getUnreadNotifications = async (req, res) => {
  try {
    const { staff_id, roles } = req.user || {};

    if (!staff_id || !Array.isArray(roles) || roles.length === 0) {
      return res.status(401).json({
        message: 'Unauthorized: Invalid user session or missing roles.',
      });
    }

    const query = `
      SELECT
        notification_id,
        message,
        order_id,
        recipient_role,
        recipient_id,
        created_at
      FROM notifications
      WHERE
        (
          recipient_id = $1
          OR recipient_role::text = ANY($2::text[])
          OR recipient_role::text = 'All'
        )
        AND is_read = FALSE
        AND (
          expires_at IS NULL
          OR expires_at > NOW()
        )
      ORDER BY created_at DESC;
    `;

    const { rows } = await pool.query(query, [staff_id, roles]);

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);

    return res.status(500).json({
      message: 'Failed to fetch notifications.',
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| MARK NOTIFICATION AS READ
|--------------------------------------------------------------------------
*/
const markNotificationAsRead = async (req, res) => {
  const client = await pool.connect();

  try {
    const { notificationId } = req.params;
    const { staff_id, roles } = req.user || {};

    if (!staff_id || !Array.isArray(roles)) {
      return res.status(401).json({
        message: 'Unauthorized: Staff ID or active roles missing.',
      });
    }

    await client.query('BEGIN');

    const notificationRes = await client.query(
      `
      SELECT
        n.notification_id,
        n.order_id,
        n.recipient_role,
        n.recipient_id,
        n.is_read
      FROM notifications n
      WHERE n.notification_id = $1
        AND (
          n.recipient_id = $2
          OR n.recipient_role::text = 'All'
          OR n.recipient_role::text = ANY($3::text[])
        )
      FOR UPDATE;
      `,
      [notificationId, staff_id, roles]
    );

    if (notificationRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        message: 'Notification not found or access denied.',
      });
    }

    const notification = notificationRes.rows[0];

    await client.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE notification_id = $1;
      `,
      [notificationId]
    );

    // If a Waiter acknowledges a notification for a Ready order, change status to Served
    if (
      (notification.recipient_role === 'Waiter' || notification.recipient_role === 'All') &&
      notification.order_id
    ) {
      const orderRes = await client.query(
        `
        SELECT order_id, status
        FROM orders
        WHERE order_id = $1
        FOR UPDATE;
        `,
        [notification.order_id]
      );

      if (orderRes.rows.length > 0 && orderRes.rows[0].status === 'Ready') {
        await client.query(
          `
          UPDATE orders
          SET status = 'Served'
          WHERE order_id = $1;
          `,
          [notification.order_id]
        );
      }
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification_id: notification.notification_id,
      order_id: notification.order_id,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error marking notification as read:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read.',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getUnreadNotifications,
  markNotificationAsRead,
};