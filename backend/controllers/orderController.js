const { pool } = require('../config/db');

/*
|--------------------------------------------------------------------------
| CREATE ORDER
|--------------------------------------------------------------------------
*/

/**
 * POST /api/v1/orders
 *
 * Creates a new order linked to a table and waiter.
 *
 * The backend calculates prices and totals using trusted
 * menu-item prices from the database.
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

    /*
     * Get trusted prices from database
     */
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
        throw new Error(
          `Menu item ${item.item_id} does not exist.`
        );
      }

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
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

    /*
     * Calculate charges
     *
     * Service charge = 10% of subtotal
     *
     * VAT = 15% of
     * (subtotal + service charge)
     */
    const calculatedServiceCharge =
      calculatedSubtotal * 0.10;

    const taxableAmount =
      calculatedSubtotal + calculatedServiceCharge;

    const calculatedVat =
      taxableAmount * 0.15;

    const calculatedTotal =
      taxableAmount + calculatedVat;

    /*
     * Insert order
     */
    const orderQuery = `
      INSERT INTO orders (
        table_id,
        waiter_id,
        status,
        payment_method,
        subtotal,
        service_charge,
        vat_amount,
        total_amount
      )
      VALUES (
        $1,
        $2,
        'Pending',
        'Pending',
        $3,
        $4,
        $5,
        $6
      )
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

    /*
     * Insert order line items
     */
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

    /*
     * Mark table as occupied
     */
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
      subtotal: calculatedSubtotal,
      service_charge: calculatedServiceCharge,
      vat_amount: calculatedVat,
      total_amount: calculatedTotal,
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


/*
|--------------------------------------------------------------------------
| KITCHEN ORDERS
|--------------------------------------------------------------------------
*/

/**
 * GET /api/v1/orders/kitchen
 *
 * Retrieves orders that still need kitchen processing.
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


/*
|--------------------------------------------------------------------------
| LIVE ORDERS
|--------------------------------------------------------------------------
*/

/**
 * GET /api/v1/orders/live
 *
 * Retrieves live orders for waiters.
 *
 * Ready orders are displayed only while their
 * Ready notification is unread.
 *
 * Other active orders remain visible.
 */
const getLiveOrders = async (req, res) => {
  try {
    const { staff_id } = req.user || {};

    if (!staff_id) {
      return res.status(401).json({
        message:
          'Unauthorized: Staff ID is missing.',
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
        o.waiter_id = $1

        AND

        o.status IN (
          'Pending',
          'Cooking',
          'Ready',
          'Served',
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
           * Ready orders are shown only while
           * the Ready notification is unread.
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

    const { rows } = await pool.query(
      query,
      [staff_id]
    );

    return res.status(200).json(rows);

  } catch (error) {
    console.error(
      'Error fetching live orders:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to fetch live orders.',
    });
  }
};


/*
|--------------------------------------------------------------------------
| REQUEST BILL
|--------------------------------------------------------------------------
*/

/**
 * POST /api/v1/orders/:orderId/request-bill
 *
 * Called by the waiter after serving the customer.
 *
 * Flow:
 *
 * Served
 *   ↓
 * Awaiting_Bill
 *   ↓
 * Cashier notification
 *
 * The notification being read does NOT mark the order as paid.
 */
const requestBill = async (req, res) => {
  const client = await pool.connect();

  try {
    const { orderId } = req.params;
    const { staff_id } = req.user || {};

    if (!staff_id) {
      return res.status(401).json({
        message:
          'Unauthorized: Staff ID is missing.',
      });
    }

    await client.query('BEGIN');

    /*
     * Get the order and lock it during this operation.
     */
    const orderRes = await client.query(
      `
      SELECT
        o.order_id,
        o.table_id,
        o.waiter_id,
        o.status,
        t.table_number
      FROM orders o
      JOIN tables t
        ON o.table_id = t.table_id
      WHERE o.order_id = $1
      FOR UPDATE;
      `,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: 'Order not found.',
      });
    }

    const order = orderRes.rows[0];

    /*
     * Only the waiter assigned to this order
     * can request its bill.
     */
    if (Number(order.waiter_id) !== Number(staff_id)) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        message:
          'You are not authorized to request the bill for this order.',
      });
    }

    /*
     * The customer must have been served first.
     *
     * We allow Ready as well because your current
     * system already uses Ready.
     */
    if (
      order.status !== 'Served' &&
      order.status !== 'Ready'
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        message:
          'The bill can only be requested after the order has been served.',
        current_status: order.status,
      });
    }

    /*
     * Change order status.
     */
    await client.query(
      `
      UPDATE orders
      SET status = 'Awaiting_Bill'
      WHERE order_id = $1;
      `,
      [orderId]
    );

    /*
     * Change table status.
     */
    await client.query(
      `
      UPDATE tables
      SET status = 'Awaiting_Bill'
      WHERE table_id = $1;
      `,
      [order.table_id]
    );

    /*
     * Create notification for ALL cashiers.
     *
     * recipient_id = NULL means the notification
     * belongs to the Cashier role rather than one
     * specific cashier.
     */
    await client.query(
      `
      INSERT INTO notifications (
        recipient_role,
        recipient_id,
        order_id,
        message
      )
      VALUES (
        'Cashier',
        NULL,
        $1,
        $2
      );
      `,
      [
        orderId,
        `Table ${order.table_number} requests the bill.`
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Bill request sent to cashier successfully.',
      order_id: orderId,
      table_id: order.table_id,
      table_number: order.table_number,
      status: 'Awaiting_Bill',
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Error requesting bill:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to request bill.',
      error: error.message,
    });

  } finally {
    client.release();
  }
};


/*
|--------------------------------------------------------------------------
| UPDATE ORDER STATUS
|--------------------------------------------------------------------------
*/

/**
 * PUT /api/v1/orders/:orderId/status
 *
 * Updates order status.
 *
 * This remains available for your existing
 * Kitchen workflow.
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
        message:
          `Invalid order status: ${status}`,
      });
    }

    await client.query('BEGIN');

    /*
     * Update order status.
     */
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

    /*
     * Get table number.
     */
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

    /*
     * Synchronize table status.
     */
    if (status === 'Awaiting_Bill') {
      await client.query(
        `
        UPDATE tables
        SET status = 'Awaiting_Bill'
        WHERE table_id = $1;
        `,
        [table_id]
      );

      /*
       * If somebody still uses the generic status
       * endpoint to request a bill, make sure the
       * cashier receives a notification.
       */
      await client.query(
        `
        INSERT INTO notifications (
          recipient_role,
          recipient_id,
          order_id,
          message
        )
        VALUES (
          'Cashier',
          NULL,
          $1,
          $2
        );
        `,
        [
          orderId,
          `Table ${tableNumber} requests the bill.`
        ]
      );
    }

    /*
     * Paid means the table is available again.
     *
     * The proper payment endpoint we create later
     * will also update the order/payment information.
     */
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

    /*
     * Create waiter notification ONLY when
     * the kitchen marks the order as Ready.
     *
     * Cooking does not need a notification because
     * the waiter can already see Cooking in Live Order Status.
     *
     * Served does not need a notification because
     * Served is the result of the waiter acknowledging
     * the Ready notification.
     */
    if (status === 'Ready') {
      await client.query(
        `
        INSERT INTO notifications (
          recipient_role,
          recipient_id,
          order_id,
          message
        )
        VALUES (
          'Waiter',
          $1,
          $2,
          $3
        );
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
      order_id: Number(orderId),
      status,
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Error updating order status:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to update status.',
      error: error.message,
    });

  } finally {
    client.release();
  }
};


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


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  createOrder,
  getKitchenOrders,
  getLiveOrders,
  updateOrderStatus,
  requestBill,
  getUnreadNotifications,
  markNotificationAsRead,
};