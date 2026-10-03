const { pool } = require('../config/db');

/*
|--------------------------------------------------------------------------
| Valid station roles
|--------------------------------------------------------------------------
*/

const VALID_STATION_ROLES = new Set([
  'Kitchen',
  'Bar',
  'Hot Drinks',
]);

/*
|--------------------------------------------------------------------------
| Helper: Get authenticated staff ID
|--------------------------------------------------------------------------
*/

const getStaffId = (req) => {
  return (
    req.user?.staff_id ||
    req.user?.id ||
    null
  );
};

/*
|--------------------------------------------------------------------------
| Helper: Get authenticated roles
|--------------------------------------------------------------------------
*/

const getUserRoles = (req) => {
  return Array.isArray(req.user?.roles)
    ? req.user.roles.map(String)
    : [];
};

/*
|--------------------------------------------------------------------------
| Helper: Is privileged user?
|--------------------------------------------------------------------------
*/

const isPrivilegedUser = (req) => {
  const roles = getUserRoles(req);

  return roles.some((role) =>
    [
      'Manager',
      'Owner',
      'Super Admin',
    ].includes(role)
  );
};

/*
|--------------------------------------------------------------------------
| 1. CREATE STATION NOTIFICATION
|--------------------------------------------------------------------------
*/

const createStationNotification = async (
  client,
  {
    recipientRole,
    orderId,
    message,
    expiresMinutes = 60,
  }
) => {
  if (
    !recipientRole ||
    !message
  ) {
    throw new Error(
      'recipientRole and message are required.'
    );
  }

  if (
    !VALID_STATION_ROLES.has(
      recipientRole
    )
  ) {
    throw new Error(
      `Invalid station notification role: ${recipientRole}`
    );
  }

  await client.query(
    `
    INSERT INTO notifications (
      recipient_role,
      recipient_id,
      order_id,
      message,
      is_read,
      created_at,
      expires_at
    )
    VALUES (
      $1::notification_recipient,
      NULL,
      $2,
      $3,
      false,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
        + ($4 * INTERVAL '1 minute')
    );
    `,
    [
      recipientRole,
      orderId,
      message,
      expiresMinutes,
    ]
  );
};

/*
|--------------------------------------------------------------------------
| 2. GET UNREAD NOTIFICATIONS
|
| IMPORTANT:
|
| Direct notification:
|   recipient_id = current staff_id
|
| Station notification:
|   recipient_id IS NULL
|   recipient_role = Kitchen / Bar / Hot Drinks
|
| Waiter notification:
|   recipient_role = Waiter
|   recipient_id = specific waiter
|
| Therefore:
|   Waiter A cannot see Waiter B's notification.
|
| notification_reads is used for broadcast notifications
| so one employee reading it does NOT remove it for everyone.
|--------------------------------------------------------------------------
*/

const getUnreadNotifications = async (
  req,
  res
) => {
  try {
    const staffId =
      getStaffId(req);

    const roles =
      getUserRoles(req);

    if (!staffId) {
      return res.status(401).json({
        success: false,
        message:
          'Authenticated staff ID is missing.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Optional station filter
    |--------------------------------------------------------------------------
    */

    const { station } = req.query;

    if (
      station &&
      !VALID_STATION_ROLES.has(station)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid station.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Important security rule
    |
    | If user is a normal Waiter:
    |
    | DO NOT use recipient_role='Waiter'
    | as a visibility rule.
    |
    | Only recipient_id can identify that waiter.
    |--------------------------------------------------------------------------
    */

    const waiterOnly =
      roles.includes('Waiter') &&
      !isPrivilegedUser(req);

    /*
    |--------------------------------------------------------------------------
    | Role visibility
    |--------------------------------------------------------------------------
    */

    const visibleRoles =
      waiterOnly
        ? []
        : roles;

    /*
    |--------------------------------------------------------------------------
    | Base query
    |--------------------------------------------------------------------------
    */

    const params = [
      staffId,
      visibleRoles,
    ];

    let query = `
      SELECT
        n.notification_id,
        n.recipient_role,
        n.recipient_id,
        n.order_id,
        n.message,
        n.is_read,
        n.created_at,
        n.expires_at

      FROM notifications n

     WHERE (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
        AND n.is_read = false

        AND (
          /*
          ------------------------------------------------------------
          Direct notification
          ------------------------------------------------------------
          */
          (
            n.recipient_id = $1
          )

          OR

          /*
          ------------------------------------------------------------
          Broadcast notification
          ------------------------------------------------------------
          */
          (
            n.recipient_id IS NULL

            AND (
              n.recipient_role = 'All'::notification_recipient

              OR n.recipient_role::text =
                 ANY($2::text[])
            )

            /*
            ----------------------------------------------------------
            Per-user read tracking for broadcast notifications
            ----------------------------------------------------------
            */
            AND NOT EXISTS (
              SELECT 1
              FROM notification_reads nr
              WHERE nr.notification_id =
                    n.notification_id
                AND nr.staff_id = $1
            )
          )
        )
    `;

    /*
    |--------------------------------------------------------------------------
    | Station filter
    |--------------------------------------------------------------------------
    */

    if (station) {
      params.push(station);

      query += `
        AND (
          n.recipient_id = $1

          OR n.recipient_role =
             'All'::notification_recipient

          OR n.recipient_role::text = $3
        )
      `;
    }

    query += `
      ORDER BY n.created_at DESC;
    `;

    const { rows } =
      await pool.query(
        query,
        params
      );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(
      'Error fetching notifications:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error fetching notifications.',
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 3. MARK NOTIFICATION AS READ
|
| SECURITY:
|
| A direct notification can ONLY be acknowledged
| by the staff member in recipient_id.
|
| A broadcast notification can be acknowledged
| individually using notification_reads.
|--------------------------------------------------------------------------
*/

const markNotificationAsRead = async (
  req,
  res
) => {
  const client =
    await pool.connect();

  try {
    const {
      notificationId,
    } = req.params;

    const staffId =
      getStaffId(req);

    const roles =
      getUserRoles(req);

    if (!staffId) {
      return res.status(401).json({
        success: false,
        message:
          'Authenticated staff ID is missing.',
      });
    }

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message:
          'Notification ID is required.',
      });
    }

    await client.query('BEGIN');

    /*
    |--------------------------------------------------------------------------
    | Get notification
    |--------------------------------------------------------------------------
    */

    const notificationRes =
      await client.query(
        `
        SELECT
          notification_id,
          recipient_role,
          recipient_id,
          order_id,
          message,
          is_read,
          created_at,
          expires_at

        FROM notifications

        WHERE notification_id = $1

        FOR UPDATE;
        `,
        [notificationId]
      );

    if (
      notificationRes.rows.length === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(404).json({
        success: false,
        message:
          'Notification not found.',
      });
    }

    const notification =
      notificationRes.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Authorization
    |--------------------------------------------------------------------------
    */

    const recipientId =
      notification.recipient_id;

    const recipientRole =
      String(
        notification.recipient_role
      );

    const isDirectNotification =
      recipientId !== null;

    let authorized = false;

    /*
    Direct notification:
    ONLY the specific recipient.
    */

    if (isDirectNotification) {
      authorized =
        Number(recipientId) ===
        Number(staffId);
    }

    /*
    Broadcast notification:
    Role or All.
    */

    else {
      authorized =
        recipientRole === 'All' ||
        roles.includes(
          recipientRole
        );
    }

    if (!authorized) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(403).json({
        success: false,
        message:
          'You are not authorized to acknowledge this notification.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | DIRECT NOTIFICATION
    |
    | Example:
    | [Kitchen] items for Table 4 are Ready...
    |
    | recipient_id = Waiter A
    |
    | Only Waiter A can mark it read.
    |--------------------------------------------------------------------------
    */

    if (isDirectNotification) {
      await client.query(
        `
        UPDATE notifications
        SET is_read = true
        WHERE notification_id = $1;
        `,
        [notificationId]
      );
    }

    /*
    |--------------------------------------------------------------------------
    | BROADCAST NOTIFICATION
    |
    | Do NOT set notifications.is_read = true.
    |
    | Instead record that THIS staff member read it.
    |--------------------------------------------------------------------------
    */

    else {
      await client.query(
        `
        INSERT INTO notification_reads (
          notification_id,
          staff_id,
          read_at
        )
        VALUES (
          $1,
          $2,
          CURRENT_TIMESTAMP
        )

        ON CONFLICT (
          notification_id,
          staff_id
        )
        DO NOTHING;
        `,
        [
          notificationId,
          staffId,
        ]
      );
    }

    /*
    |--------------------------------------------------------------------------
    | READY NOTIFICATION -> SERVED
    |
    | Only the specific waiter who received the notification
    | can cause the station's Ready items to become Served.
    |--------------------------------------------------------------------------
    */

    if (
      recipientRole === 'Waiter' &&
      isDirectNotification &&
      Number(recipientId) ===
        Number(staffId) &&
      notification.order_id
    ) {
      /*
      --------------------------------------------------------------
      | Extract station from message
      |
      | Example:
      | [Kitchen] items for Table 4 are Ready for pickup!
      --------------------------------------------------------------
      */

      const stationMatch =
        notification.message?.match(
          /^\[([^\]]+)\]/
        );

      const station =
        stationMatch
          ? stationMatch[1]
          : null;

      if (
        station &&
        VALID_STATION_ROLES.has(
          station
        )
      ) {
        /*
        --------------------------------------------------------------
        | Mark Ready items for this station as Served
        --------------------------------------------------------------
        */

        await client.query(
          `
          UPDATE order_items
          SET status =
            'Served'::item_status

          WHERE order_id = $1
            AND station = $2
            AND status = 'Ready'::item_status;
          `,
          [
            notification.order_id,
            station,
          ]
        );

        /*
        --------------------------------------------------------------
        | Recalculate order status
        --------------------------------------------------------------
        */

        const activeItemsRes =
          await client.query(
            `
            SELECT
              status
            FROM order_items

            WHERE order_id = $1
              AND status !=
                  'Cancelled'::item_status;
            `,
            [
              notification.order_id,
            ]
          );

        const statuses =
          activeItemsRes.rows.map(
            (row) =>
              row.status
          );

        let newOrderStatus =
          'Cancelled';

        if (
          statuses.length > 0
        ) {
          const allServed =
            statuses.every(
              (status) =>
                status ===
                'Served'
            );

          const allReadyOrServed =
            statuses.every(
              (status) =>
                status ===
                  'Ready' ||
                status ===
                  'Served'
            );

          const anyPreparing =
            statuses.some(
              (status) =>
                status ===
                'Preparing'
            );

          const anyPending =
            statuses.some(
              (status) =>
                status ===
                'Pending'
            );

          /*
          ------------------------------------------------------------
          | If everything is served
          ------------------------------------------------------------
          */

          if (allServed) {
            newOrderStatus =
              'Served';
          }

          /*
          ------------------------------------------------------------
          | Everything ready/served
          ------------------------------------------------------------
          */

          else if (
            allReadyOrServed
          ) {
            newOrderStatus =
              'Ready';
          }

          /*
          ------------------------------------------------------------
          | Preparing
          ------------------------------------------------------------
          */

          else if (
            anyPreparing
          ) {
            newOrderStatus =
              'Preparing';
          }

          /*
          ------------------------------------------------------------
          | Pending
          ------------------------------------------------------------
          */

          else if (
            anyPending
          ) {
            newOrderStatus =
              'Pending';
          }
        }

        await client.query(
          `
          UPDATE orders
          SET status =
            $1::order_status

          WHERE order_id = $2;
          `,
          [
            newOrderStatus,
            notification.order_id,
          ]
        );
      }
    }

    await client.query(
      'COMMIT'
    );

    return res.status(200).json({
      success: true,
      message:
        'Notification marked as read.',
      notification_id:
        Number(notificationId),
    });
  } catch (error) {
    await client.query(
      'ROLLBACK'
    );

    console.error(
      'Error marking notification as read:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error marking notification as read.',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  createStationNotification,
  getUnreadNotifications,
  markNotificationAsRead,
};