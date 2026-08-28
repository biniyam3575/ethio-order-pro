
const { pool } = require('../config/db');

/**
 * POST /api/v1/orders
 * Creates an order record linked to a table and waiter.
 */
const createOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    const { table_id, waiter_id, items } = req.body;

    if (
      !table_id ||
      !waiter_id ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          'Missing required fields: table_id, waiter_id, and items array are required.',
      });
    }

    await client.query('BEGIN');

    // Get trusted prices from database
    const itemIds = items.map((i) => i.item_id);

    const dbItemsRes = await client.query(
      `
      SELECT item_id, price
      FROM menu_items
      WHERE item_id = ANY($1::int[])
      `,
      [itemIds]
    );

    const priceMap = new Map(
      dbItemsRes.rows.map((row) => [
        row.item_id,
        parseFloat(row.price),
      ])
    );

    let calculatedSubtotal = 0;

    const validatedItems = items.map((item) => {
      const unitPrice = priceMap.get(item.item_id);

      if (unitPrice === undefined) {
        throw new Error(`Menu item ${item.item_id} does not exist.`);
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error(
          `Invalid quantity for menu item ${item.item_id}.`
        );
      }

      calculatedSubtotal += unitPrice * item.quantity;

      return {
        ...item,
        unit_price: unitPrice,
      };
    });

    const calculatedServiceCharge =
      calculatedSubtotal * 0.10;

    const calculatedVat =
      calculatedSubtotal * 0.15;

    const calculatedTotal =
      calculatedSubtotal +
      calculatedServiceCharge +
      calculatedVat;

    // Insert order
    const orderQuery = `
      INSERT INTO orders (
        table_id,
        waiter_id,
        status,
        subtotal,
        service_charge,
        vat_amount,
        total_amount
      )
      VALUES ($1, $2, 'Pending', $3, $4, $5, $6)
      RETURNING order_id;
    `;

    const orderValues = [
      table_id,
      waiter_id,
      calculatedSubtotal,
      calculatedServiceCharge,
      calculatedVat,
      calculatedTotal,
    ];

    const orderRes = await client.query(
      orderQuery,
      orderValues
    );

    const orderId = orderRes.rows[0].order_id;

    // Insert line items
    for (const item of validatedItems) {
      const itemQuery = `
        INSERT INTO order_items (
          order_id,
          item_id,
          quantity,
          unit_price,
          note
        )
        VALUES ($1, $2, $3, $4, $5);
      `;

      await client.query(itemQuery, [
        orderId,
        item.item_id,
        item.quantity,
        item.unit_price,
        item.note || '',
      ]);
    }

    // Mark table as occupied
    await client.query(
      `
      UPDATE tables
      SET status = 'Occupied'
      WHERE table_id = $1;
      `,
      [table_id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Order created successfully!',
      order_id: orderId,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      '=== ORDER CREATION ERROR ===',
      error
    );

    return res.status(500).json({
      message: 'Database error creating order.',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/**
 * GET /api/v1/orders/kitchen
 *
 * Retrieves Pending and Cooking orders.
 */
const getKitchenOrders = async (req, res) => {
  try {
    const query = `
      SELECT
        o.order_id,
        o.table_id,
        t.table_number,
        o.status,
        o.created_at,

        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'item_id', oi.item_id,
              'name', m.name,
              'quantity', oi.quantity,
              'note', oi.note
            )
          ) FILTER (WHERE oi.order_id IS NOT NULL),
          '[]'
        ) AS items

      FROM orders o

      JOIN tables t
        ON o.table_id = t.table_id

      LEFT JOIN order_items oi
        ON o.order_id = oi.order_id

      LEFT JOIN menu_items m
        ON oi.item_id = m.item_id

      WHERE o.status IN ('Pending', 'Cooking')

      GROUP BY
        o.order_id,
        t.table_number

      ORDER BY o.created_at ASC;
    `;

    const { rows } = await pool.query(query);

    return res.status(200).json(rows);
  } catch (error) {
    console.error(
      'Error fetching kitchen orders:',
      error
    );

    return res.status(500).json({
      message:
        'Database error fetching kitchen orders.',
    });
  }
};

/**
 * GET /api/v1/orders/live
 *
 * Retrieves live orders for waiters.
 */
/**
 * GET /api/v1/orders/live
 *
 * Retrieves live orders for waiters.
 *
 * Ready orders are displayed only while their
 * Ready notification is still unread.
 */
const getLiveOrders = async (req, res) => {
  try {
    const { staff_id } = req.user || {};

    if (!staff_id) {
      return res.status(401).json({
        message: 'Unauthorized: Staff ID is missing.'
      });
    }

    const query = `
      SELECT
        o.order_id,
        o.table_id,
        t.table_number,
        o.status,
        o.created_at,
        COUNT(oi.id) AS item_count

      FROM orders o

      JOIN tables t
        ON o.table_id = t.table_id

      LEFT JOIN order_items oi
        ON o.order_id = oi.order_id

      WHERE
        o.status IN (
          'Pending',
          'Cooking',
          'Ready',
          'Awaiting_Bill'
        )

        AND

        (
          /*
           * Non-Ready orders are always shown.
           */
          o.status <> 'Ready'

          OR

          /*
           * Ready orders are shown only when
           * their Ready notification is unread.
           */
          EXISTS (
            SELECT 1
            FROM notifications n
            WHERE
              n.order_id = o.order_id
              AND n.recipient_id = o.waiter_id
              AND n.recipient_role = 'Waiter'
              AND n.is_read = FALSE
              AND n.message = CONCAT(
                'Order #',
                o.order_id,
                ' for Table ',
                t.table_number,
                ' is Ready.'
              )
          )
        )

      GROUP BY
        o.order_id,
        t.table_number

      ORDER BY o.created_at DESC;
    `;

    const { rows } = await pool.query(query);

    return res.status(200).json(rows);

  } catch (error) {
    console.error(
      'Error fetching live orders:',
      error
    );

    return res.status(500).json({
      message: 'Failed to fetch live orders.'
    });
  }
};

/**
 * PUT /api/v1/orders/:orderId/status
 *
 * Updates order status.
 *
 * When Kitchen changes an order to Ready:
 * 1. Order becomes Ready
 * 2. Waiter receives a notification
 */
const updateOrderStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      'Pending',
      'Cooking',
      'Ready',
      'Served',
      'Awaiting_Bill',
      'Paid',
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid order status: ${status}`,
      });
    }

    await client.query('BEGIN');

    // Update order status
    const updateRes = await client.query(
      `
      UPDATE orders
      SET status = $1
      WHERE order_id = $2
      RETURNING table_id, waiter_id;
      `,
      [status, orderId]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: 'Order not found.',
      });
    }

    const {
      table_id,
      waiter_id,
    } = updateRes.rows[0];

    // Get table number
    const tableRes = await client.query(
      `
      SELECT table_number
      FROM tables
      WHERE table_id = $1;
      `,
      [table_id]
    );

    const tableNumber =
      tableRes.rows[0]?.table_number || table_id;

    // Synchronize table status
    if (status === 'Awaiting_Bill') {
      await client.query(
        `
        UPDATE tables
        SET status = 'Awaiting_Bill'
        WHERE table_id = $1;
        `,
        [table_id]
      );
    }

    if (status === 'Paid') {
      await client.query(
        `
        UPDATE tables
        SET status = 'Available'
        WHERE table_id = $1;
        `,
        [table_id]
      );
    }

    // Create waiter notification
  if (
  status === 'Ready' ||
  status === 'Served' ||
  status === 'Cooking'
) {
  await client.query(
    `
    INSERT INTO notifications (
      recipient_role,
      recipient_id,
      order_id,
      message
    )
    VALUES ('Waiter', $1, $2, $3);
    `,
    [
      waiter_id,
      orderId,
      `Order #${orderId} for Table ${tableNumber} is ${status}.`,
    ]
  );
}

    await client.query('COMMIT');

    return res.status(200).json({
      message:
        'Order status updated successfully.',
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Error updating order status:',
      error
    );

    return res.status(500).json({
      message: 'Failed to update status.',
      error: error.message,
    });
  } finally {
    client.release();
  }
};


/**
 * GET /api/v1/orders/notifications
 * Fetches unread notifications for the logged-in user.
 */
const getUnreadNotifications = async (req, res) => {
  try {
    const { staff_id, roles } = req.user || {};

    // Make sure the authenticated user has the required information
    if (!staff_id || !Array.isArray(roles)) {
      return res.status(401).json({
        message: 'Unauthorized: Invalid user session.'
      });
    }

    /*
     * A user can have multiple roles.
     * We check every role against recipient_role.
     *
     * ::notification_recipient casts the PostgreSQL parameter
     * to the ENUM type, fixing:
     *
     * operator does not exist:
     * notification_recipient = text
     */
    const query = `
      SELECT
        notification_id,
        message,
        order_id,
        created_at
      FROM notifications
      WHERE
        (
          recipient_id = $1
          OR recipient_role = ANY($2::notification_recipient[])
          OR recipient_role = 'All'
        )
        AND is_read = FALSE
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC;
    `;

    const { rows } = await pool.query(query, [
      staff_id,
      roles
    ]);

    return res.status(200).json(rows);

  } catch (error) {
    console.error('Error fetching notifications:', error);

    return res.status(500).json({
      message: 'Failed to fetch notifications.'
    });
  }
};

/**
 * PUT /api/v1/orders/notifications/:notificationId/read
 *
 * Marks a notification as read for the logged-in staff member.
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { staff_id } = req.user || {};

    if (!staff_id) {
      return res.status(401).json({
        message: 'Unauthorized: Staff ID is missing.'
      });
    }

    const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE
        notification_id = $1
        AND (
          recipient_id = $2
          OR recipient_role = 'All'
        )
      RETURNING
        notification_id,
        order_id;
    `;

    const { rows } = await pool.query(query, [
      notificationId,
      staff_id
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        message:
          'Notification not found or does not belong to this user.'
      });
    }

    return res.status(200).json({
      message: 'Notification marked as read.',
      notification_id: rows[0].notification_id,
      order_id: rows[0].order_id
    });

  } catch (error) {
    console.error(
      'Error marking notification as read:',
      error
    );

    return res.status(500).json({
      message: 'Failed to mark notification as read.'
    });
  }
};



module.exports = {
  createOrder,
  getKitchenOrders,
  getLiveOrders,
  updateOrderStatus,
  getUnreadNotifications,
  markNotificationAsRead,
};

