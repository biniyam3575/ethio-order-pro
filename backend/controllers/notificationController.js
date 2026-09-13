const { pool } = require('../config/db');

/**
 * Helper to insert station notifications safely inside an existing database transaction client or pool
 */
const createStationNotification = async (executor, { recipientRole, orderId, message, expiresMinutes = 60 }) => {
  const query = `
    INSERT INTO notifications (recipient_role, order_id, message, is_read, created_at, expires_at)
    VALUES (
      $1::notification_recipient,
      $2,
      $3,
      FALSE,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP + ($4 || ' minutes')::INTERVAL
    )
    RETURNING notification_id;
  `;
  const values = [recipientRole, orderId, message, `${expiresMinutes}`];
  return await executor.query(query, values);
};

/*
|--------------------------------------------------------------------------
| GET UNREAD NOTIFICATIONS
|--------------------------------------------------------------------------
*/
const getUnreadNotifications = async (req, res) => {
  try {
    const { staff_id, roles } = req.user || {};
    const { station } = req.query;

    if (!staff_id || !Array.isArray(roles) || roles.length === 0) {
      return res.status(401).json({
        message: 'Unauthorized: Invalid user session or missing roles.',
      });
    }

    const roleStrings = roles.map((r) => String(r));

    const allowedStations = ['Kitchen', 'Bar', 'Hot Drinks'];

    if (station && !allowedStations.includes(station)) {
      return res.status(400).json({
        message: 'Invalid station.',
      });
    }

    const params = [staff_id, roleStrings];

    let query = `
      SELECT
        notification_id,
        message,
        order_id,
        recipient_role::text AS recipient_role,
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
          OR expires_at > CURRENT_TIMESTAMP
        )
        AND created_at >= (
          CURRENT_TIMESTAMP - INTERVAL '12 hours'
        )
    `;

    if (station) {
      params.push(station);

      query += `
        AND (
          recipient_role::text = $3
          OR recipient_role::text = 'All'
          OR recipient_id = $1
        )
      `;
    }

    query += `
      ORDER BY created_at DESC;
    `;

    const { rows } = await pool.query(query, params);

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

    const roleStrings = roles.map((r) => String(r));

    await client.query('BEGIN');

    const notificationRes = await client.query(
      `
      SELECT
        n.notification_id,
        n.order_id,
        n.message,
        n.recipient_role::text AS recipient_role,
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
      [notificationId, staff_id, roleStrings]
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

    if (
      (notification.recipient_role === 'Waiter' ||
        notification.recipient_role === 'All') &&
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

      if (orderRes.rows.length > 0) {
        const stationMatch = notification.message?.match(
          /^\[([^\]]+)\]/
        );

        const station = stationMatch
          ? stationMatch[1]
          : null;

        if (station) {
          await client.query(
            `
            UPDATE order_items
            SET status = 'Served'::item_status
            WHERE order_id = $1
              AND station = $2
              AND status = 'Ready'::item_status;
            `,
            [notification.order_id, station]
          );
        }

        const activeItemsRes = await client.query(
          `
          SELECT status
          FROM order_items
          WHERE order_id = $1
            AND status != 'Cancelled'::item_status;
          `,
          [notification.order_id]
        );

        const activeStatuses = activeItemsRes.rows.map(
          (row) => row.status
        );

        let newOrderStatus = 'Cancelled';

        if (activeStatuses.length > 0) {
          const allServed = activeStatuses.every(
            (itemStatus) =>
              itemStatus === 'Served'
          );

          const allReadyOrServed = activeStatuses.every(
            (itemStatus) =>
              itemStatus === 'Ready' ||
              itemStatus === 'Served'
          );

          const anyPreparing = activeStatuses.some(
            (itemStatus) =>
              itemStatus === 'Preparing'
          );

          const anyPending = activeStatuses.some(
            (itemStatus) =>
              itemStatus === 'Pending'
          );

          if (allServed) {
            newOrderStatus = 'Served';
          } else if (allReadyOrServed) {
            newOrderStatus = 'Ready';
          } else if (anyPreparing) {
            newOrderStatus = 'Preparing';
          } else if (anyPending) {
            newOrderStatus = 'Pending';
          }
        }

        await client.query(
          `
          UPDATE orders
          SET status = $1::order_status
          WHERE order_id = $2;
          `,
          [newOrderStatus, notification.order_id]
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

    console.error(
      'Error marking notification as read:',
      error
    );

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
  createStationNotification,
};