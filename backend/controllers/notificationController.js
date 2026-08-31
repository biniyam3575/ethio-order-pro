const { pool } = require('../config/db');
/*
|--------------------------------------------------------------------------
| GET UNREAD NOTIFICATIONS
|--------------------------------------------------------------------------
*/

/**
 * GET /api/v1/orders/notifications
 *
 * Fetches unread notifications for the logged-in user.
 *
 * Role notifications are included.
 */
const getUnreadNotifications = async (req, res) => {
  try {
    const {
      staff_id,
      roles,
    } = req.user || {};

    if (
      !staff_id ||
      !Array.isArray(roles)
    ) {
      return res.status(401).json({
        message:
          'Unauthorized: Invalid user session.',
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
          OR recipient_role = ANY(
            $2::notification_recipient[]
          )
          OR recipient_role = 'All'
        )

        AND is_read = FALSE

        AND (
          expires_at IS NULL
          OR expires_at > NOW()
        )

      ORDER BY created_at DESC;
    `;

    const { rows } = await pool.query(
      query,
      [
        staff_id,
        roles,
      ]
    );

    return res.status(200).json(rows);

  } catch (error) {
    console.error(
      'Error fetching notifications:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to fetch notifications.',
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
    const { staff_id } = req.user || {};

    if (!staff_id) {
      return res.status(401).json({
        message: 'Unauthorized: Staff ID is missing.',
      });
    }

    await client.query('BEGIN');

    /*
    |--------------------------------------------------------------------------
    | 1. Find the notification
    |--------------------------------------------------------------------------
    */

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
          OR n.recipient_role = 'All'
          OR n.recipient_role = (
            SELECT role::text::notification_recipient
            FROM staff_roles
            WHERE staff_id = $2
            LIMIT 1
          )
        )
      FOR UPDATE;
      `,
      [notificationId, staff_id]
    );

    if (notificationRes.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message:
          'Notification not found or does not belong to this user.',
      });
    }

    const notification = notificationRes.rows[0];

    /*
    |--------------------------------------------------------------------------
    | 2. Mark notification as read
    |--------------------------------------------------------------------------
    */

    await client.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE notification_id = $1;
      `,
      [notificationId]
    );

    /*
    |--------------------------------------------------------------------------
    | 3. READY → SERVED
    |--------------------------------------------------------------------------
    |
    | If this is a Waiter notification connected to an order
    | that is currently Ready, acknowledge the notification
    | AND move the order to Served.
    |
    */

    if (
      notification.recipient_role === 'Waiter' &&
      notification.order_id
    ) {
      const orderRes = await client.query(
        `
        SELECT
          order_id,
          table_id,
          status
        FROM orders
        WHERE order_id = $1
        FOR UPDATE;
        `,
        [notification.order_id]
      );

      if (orderRes.rows.length > 0) {
        const order = orderRes.rows[0];

        /*
         * Only Ready orders should become Served.
         *
         * This prevents an unrelated notification from
         * accidentally changing another order's status.
         */
        if (order.status === 'Ready') {
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
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification_id:
        notification.notification_id,
      order_id:
        notification.order_id,
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Error marking notification as read:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to mark notification as read.',
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