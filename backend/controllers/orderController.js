const { pool } = require('../config/db');
const VALID_STATION_ROLES = new Set(['Kitchen', 'Bar', 'Hot Drinks']);
const { createStationNotification } = require('./notificationController'); 
/*
|--------------------------------------------------------------------------
| 1. CREATE ORDER (Station Routing, Auto Tax Calculation & Table Occupancy)
|--------------------------------------------------------------------------
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

    const tableRes = await client.query(
      `
      SELECT table_id, table_number, status
      FROM tables
      WHERE table_id = $1
      FOR UPDATE;
      `,
      [table_id]
    );

    if (tableRes.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: 'Table not found.',
      });
    }

    const table = tableRes.rows[0];

    if (table.status === 'Awaiting_Bill') {
      await client.query('ROLLBACK');

      return res.status(400).json({
        message:
          `Table ${table.table_number} is awaiting bill settlement and cannot accept a new order.`,
      });
    }

    const itemIds = items.map((i) => String(i.item_id));

    const dbItemsRes = await client.query(
      `
      SELECT item_id, price, station, is_available
      FROM menu_items
      WHERE item_id::text = ANY($1::text[]);
      `,
      [itemIds]
    );

    const dbItemsMap = new Map(
      dbItemsRes.rows.map((row) => [
        String(row.item_id),
        {
          price: parseFloat(row.price),
          station: row.station || 'Kitchen',
          is_available: row.is_available,
        },
      ])
    );

    let calculatedSubtotal = 0;
    const stationsSet = new Set();

    const validatedItems = items.map((item) => {
      const dbItem = dbItemsMap.get(String(item.item_id));

      if (!dbItem) {
        throw new Error(
          `Menu item ${item.item_id} does not exist in the database.`
        );
      }

      if (!dbItem.is_available) {
        throw new Error(
          `Menu item ${item.item_id} is currently unavailable.`
        );
      }

      const qty = parseInt(item.quantity, 10);

      if (isNaN(qty) || qty <= 0) {
        throw new Error(
          `Invalid quantity for menu item ${item.item_id}.`
        );
      }

      calculatedSubtotal += dbItem.price * qty;
      stationsSet.add(dbItem.station);

      return {
        ...item,
        quantity: qty,
        unit_price: dbItem.price,
        station: dbItem.station,
      };
    });

    const calculatedServiceCharge =
      calculatedSubtotal * 0.10;

    const taxableAmount =
      calculatedSubtotal + calculatedServiceCharge;

    const calculatedVat =
      taxableAmount * 0.15;

    const calculatedTotal =
      taxableAmount + calculatedVat;

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

    const orderRes = await client.query(orderQuery, [
      table_id,
      waiter_id,
      calculatedSubtotal,
      calculatedServiceCharge,
      calculatedVat,
      calculatedTotal,
    ]);

    const orderId = orderRes.rows[0].order_id;

    for (const item of validatedItems) {
      await client.query(
        `
        INSERT INTO order_items (
          order_id,
          item_id,
          quantity,
          unit_price,
          station,
          status,
          note
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'Pending',
          $6
        );
        `,
        [
          orderId,
          item.item_id,
          item.quantity,
          item.unit_price,
          item.station,
          item.note || '',
        ]
      );
    }

    await client.query(
      `
      UPDATE tables
      SET status = 'Occupied'
      WHERE table_id = $1;
      `,
      [table_id]
    );

    for (const station of stationsSet) {
      const recipientRole = VALID_STATION_ROLES.has(station)
        ? station
        : 'Kitchen';

      await client.query(
        `
        INSERT INTO notifications (
          recipient_role,
          recipient_id,
          order_id,
          message
        )
        VALUES (
          $1::notification_recipient,
          NULL,
          $2,
          $3
        );
        `,
        [
          recipientRole,
          orderId,
          `New order #${orderId} received for Table ${table.table_number}.`,
        ]
      );
    }

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

    console.error('=== ORDER CREATION ERROR ===', error);

    return res.status(500).json({
      message:
        error.message || 'Database error creating order.',
    });
  } finally {
    client.release();
  }
};

/*
|--------------------------------------------------------------------------
| 2. STATION ORDERS (KDS/Bar Display Views with Persistent Dismissal)
|--------------------------------------------------------------------------
*/
const getStationOrders = async (req, res) => {
  try {
    const { station } = req.query;

    if (!station) {
      return res.status(400).json({
        message: 'Station is required.'
      });
    }

    const allowedStations = ['Kitchen', 'Bar', 'Hot Drinks'];

    if (!allowedStations.includes(station)) {
      return res.status(400).json({
        message: 'Invalid station.'
      });
    }

    const query = `
      SELECT
        o.order_id,
        o.table_id,
        t.table_number,
        o.status AS order_status,
        o.created_at,

        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'order_item_id', oi.id,
              'item_id', oi.item_id,
              'name', m.name,
              'quantity', oi.quantity,
              'station', oi.station,
              'status', oi.status,
              'note', oi.note,
              'cancellation_reason', oi.cancellation_reason,
              'cancelled_at', oi.cancelled_at,
              'ready_at', oi.ready_at
            )
            ORDER BY oi.created_at ASC
          ) FILTER (
            WHERE oi.id IS NOT NULL
          ),
          '[]'::json
        ) AS items

      FROM orders o

      INNER JOIN tables t
        ON o.table_id = t.table_id

      INNER JOIN order_items oi
        ON o.order_id = oi.order_id
       AND oi.station = $1

      INNER JOIN menu_items m
        ON oi.item_id = m.item_id

      LEFT JOIN station_order_dismissals sod
        ON sod.order_id = o.order_id
       AND sod.station = $1

      WHERE sod.id IS NULL
        AND (
          o.status IN ('Pending', 'Preparing', 'Cooking', 'Ready', 'Served')
          OR o.status = 'Cancelled'
          OR EXISTS (
            SELECT 1
            FROM order_items active_oi
            WHERE active_oi.order_id = o.order_id
              AND active_oi.station = $1
              AND active_oi.status != 'Cancelled'
          )
        )

      GROUP BY
        o.order_id,
        o.table_id,
        t.table_number,
        o.status,
        o.created_at

      ORDER BY o.created_at ASC;
    `;

    const { rows } = await pool.query(query, [station]);

    return res.status(200).json(rows);

  } catch (error) {
    console.error('Error fetching station orders:', error);

    return res.status(500).json({
      message: 'Database error fetching station orders.'
    });
  }
};


/*
|--------------------------------------------------------------------------
| DISMISS STATION ORDER (Persists Dismissal to Database)
|--------------------------------------------------------------------------
*/
const dismissStationOrder = async (req, res) => {
  try {
    const { orderId, station } = req.body;

    if (!orderId || !station) {
      return res.status(400).json({ message: 'Missing orderId or station.' });
    }

    await pool.query(
      `INSERT INTO station_order_dismissals (order_id, station)
       VALUES ($1, $2)
       ON CONFLICT (order_id, station) DO NOTHING;`,
      [orderId, station]
    );

    return res.status(200).json({ success: true, message: 'Ticket dismissed.' });
  } catch (error) {
    console.error('Error dismissing station order:', error);
    return res.status(500).json({ message: 'Database error dismissing station order.' });
  }
};

/*
|--------------------------------------------------------------------------
| 3. LIVE ORDERS (Waiter View - Aggregated Per Table)
|--------------------------------------------------------------------------
*/
const getLiveOrders = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.table_id,
        t.table_number,
        t.section,
        t.status AS table_status,
        s.full_name AS waiter_name,
        ARRAY_AGG(o.order_id) AS order_ids,
        COUNT(DISTINCT o.order_id)::int AS total_orders_count,
        SUM(o.subtotal) AS group_subtotal,
        SUM(o.service_charge) AS group_service_charge,
        SUM(o.vat_amount) AS group_vat,
        SUM(o.total_amount) AS group_total_amount,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'order_id', o.order_id,
              'order_status', o.status,
              'created_at', o.created_at,
              'items', items_by_order.items
            )
          ), '[]'
        ) AS orders
      FROM tables t
      JOIN orders o ON t.table_id = o.table_id
      LEFT JOIN staff s ON o.waiter_id = s.staff_id
      LEFT JOIN LATERAL (
        SELECT 
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'item_id', oi.id,
              'menu_item_id', oi.item_id,
              'name', m.name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'station', oi.station,
              'status', oi.status,
              'note', oi.note
            )
          ) AS items
        FROM order_items oi
        JOIN menu_items m ON oi.item_id = m.item_id
        WHERE oi.order_id = o.order_id
      ) items_by_order ON TRUE
      WHERE o.status NOT IN ('Paid', 'Cancelled')
      GROUP BY t.table_id, t.table_number, t.section, t.status, s.full_name
      ORDER BY MIN(o.created_at) ASC;
    `;

    const { rows } = await pool.query(query);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching live table orders:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching live orders.' });
  }
};

/*
|--------------------------------------------------------------------------
| 4. REQUEST BILL FOR ENTIRE TABLE (Supports Table or Order ID)
|--------------------------------------------------------------------------
*/
const requestBill = async (req, res) => {
  const client = await pool.connect();

  try {
    const tableId = req.body.tableId;
    const orderId = req.params.orderId;

    await client.query('BEGIN');

    let targetTableId = tableId;
    let targetOrderIds = [];

    if (targetTableId) {
      const ordersRes = await client.query(
        `SELECT order_id FROM orders WHERE table_id = $1 AND status NOT IN ('Paid', 'Cancelled') FOR UPDATE;`,
        [targetTableId]
      );
      targetOrderIds = ordersRes.rows.map((o) => o.order_id);
    } else if (orderId && orderId !== 'undefined' && orderId !== 'null') {
      const orderRes = await client.query(
        `SELECT order_id, table_id FROM orders WHERE order_id = $1 FOR UPDATE;`,
        [orderId]
      );

      if (orderRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Order not found.' });
      }

      targetTableId = orderRes.rows[0].table_id;

      const groupRes = await client.query(
        `SELECT order_id FROM orders WHERE table_id = $1 AND status NOT IN ('Paid', 'Cancelled');`,
        [targetTableId]
      );
      targetOrderIds = groupRes.rows.map((o) => o.order_id);
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Missing valid tableId or orderId.' });
    }

    if (targetOrderIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'No active orders found for this table.' });
    }

    await client.query(
      `UPDATE orders SET status = 'Awaiting_Bill' WHERE order_id = ANY($1::int[]);`,
      [targetOrderIds]
    );

    await client.query(
      `UPDATE tables SET status = 'Awaiting_Bill' WHERE table_id = $1;`,
      [targetTableId]
    );

    const tableRes = await client.query(
      `SELECT table_number FROM tables WHERE table_id = $1;`,
      [targetTableId]
    );
    const tableNum = tableRes.rows[0]?.table_number || targetTableId;

    await client.query(
      `
      INSERT INTO notifications (recipient_role, recipient_id, order_id, message)
      VALUES ('Cashier', NULL, $1, $2);
      `,
      [targetOrderIds[0], `Table ${tableNum} requested bill settlement.`]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Bill request sent to cashier.',
      table_id: targetTableId,
      status: 'Awaiting_Bill',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to request bill:', error);
    return res.status(500).json({ message: 'Failed to request bill.', error: error.message });
  } finally {
    client.release();
  }
};

/*
|--------------------------------------------------------------------------
| 5. UPDATE ITEM STATUS (Progresses Item & Cascades Order Status)
|--------------------------------------------------------------------------
*/
const updateOrderItemStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const { orderItemId } = req.params;
    const { status } = req.body;

    if (!orderItemId || !status) {
      return res.status(400).json({
        message: 'Missing orderItemId or status.',
      });
    }

    const allowedStatuses = ['Pending', 'Preparing', 'Ready', 'Served'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid item status.',
      });
    }

    await client.query('BEGIN');

    const itemUpdateRes = await client.query(
      `
      UPDATE order_items
      SET
        status = $1::item_status,
        ready_at = CASE
          WHEN $1 = 'Ready' THEN NOW()
          ELSE ready_at
        END
      WHERE id = $2
      RETURNING order_id, station;
      `,
      [status, orderItemId]
    );

    if (itemUpdateRes.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: `Order item with ID ${orderItemId} not found.`,
      });
    }

    const { order_id, station } = itemUpdateRes.rows[0];

    const orderRes = await client.query(
      `
      SELECT waiter_id, table_id, status
      FROM orders
      WHERE order_id = $1
      FOR UPDATE;
      `,
      [order_id]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: 'Associated order not found.',
      });
    }

    const {
      waiter_id,
      table_id,
    } = orderRes.rows[0];

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

    const stationItemsRes = await client.query(
      `
      SELECT status
      FROM order_items
      WHERE order_id = $1
        AND station = $2
        AND status != 'Cancelled'::item_status;
      `,
      [order_id, station]
    );

    const stationStatuses = stationItemsRes.rows.map(
      (row) => row.status
    );

    const stationHasActiveItems =
      stationStatuses.length > 0;

    const allStationItemsReady =
      stationHasActiveItems &&
      stationStatuses.every(
        (s) => s === 'Ready' || s === 'Served'
      );

    if (status === 'Ready' && allStationItemsReady) {
      const existingNotif = await client.query(
        `
        SELECT notification_id
        FROM notifications
        WHERE order_id = $1
          AND recipient_role = 'Waiter'
          AND recipient_id = $2
          AND message = $3;
        `,
        [
          order_id,
          waiter_id,
          `[${station}] items for Table ${tableNumber} are Ready for pickup!`,
        ]
      );

      if (existingNotif.rows.length === 0) {
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
            order_id,
            `[${station}] items for Table ${tableNumber} are Ready for pickup!`,
          ]
        );
      }
    }

    const allItemsRes = await client.query(
      `
      SELECT status
      FROM order_items
      WHERE order_id = $1
        AND status != 'Cancelled'::item_status;
      `,
      [order_id]
    );

    const activeStatuses = allItemsRes.rows.map(
      (row) => row.status
    );

    let newOrderStatus = 'Cancelled';

    if (activeStatuses.length > 0) {
      const allActiveReady = activeStatuses.every(
        (s) => s === 'Ready' || s === 'Served'
      );

      const anyActivePreparing = activeStatuses.some(
        (s) => s === 'Preparing'
      );

      const anyActivePending = activeStatuses.some(
        (s) => s === 'Pending'
      );

      if (allActiveReady) {
        newOrderStatus = 'Ready';
      } else if (anyActivePreparing) {
        newOrderStatus = 'Preparing';
      } else if (anyActivePending) {
        newOrderStatus = 'Pending';
      }
    }

    await client.query(
      `
      UPDATE orders
      SET status = $1::order_status
      WHERE order_id = $2;
      `,
      [newOrderStatus, order_id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Status updated successfully.',
      order_id: Number(order_id),
      station_ready: allStationItemsReady,
      order_status: newOrderStatus,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      '=== UPDATE ITEM STATUS ERROR ===',
      error
    );

    return res.status(500).json({
      message: 'Failed to update item status.',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/*
|--------------------------------------------------------------------------
| CANCEL ORDER TICKET (Recalculates Financials to Zero & Updates Station Items)
|--------------------------------------------------------------------------
*/
const cancelOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    const orderId = req.params.orderId || req.params.id;
    const { reason } = req.body;
    const staffId = req.user?.staff_id || req.user?.id;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required.' });
    }

    await client.query('BEGIN');

    // 1. Lock and retrieve order
    const orderRes = await client.query(
      `SELECT order_id, table_id, waiter_id, status FROM orders WHERE order_id = $1 FOR UPDATE;`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order ticket not found.' });
    }

    const order = orderRes.rows[0];

    if (['Paid', 'Cancelled', 'Completed'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Cannot cancel an order with status '${order.status}'.`,
      });
    }

    // 2. Identify active stations prior to cancellation
    const stationRes = await client.query(
      `SELECT DISTINCT station FROM order_items WHERE order_id = $1 AND status != 'Cancelled'::item_status;`,
      [orderId]
    );

    const tableRes = await client.query(
      `SELECT table_number FROM tables WHERE table_id = $1;`,
      [order.table_id]
    );
    const tableNumber = tableRes.rows[0]?.table_number || order.table_id;

    // 3. Update Order record: set status to Cancelled and zero out financial columns
    await client.query(
      `UPDATE orders 
       SET status = 'Cancelled'::order_status, 
           subtotal = 0.00,
           service_charge = 0.00,
           vat_amount = 0.00,
           total_amount = 0.00,
           cancellation_reason = $1, 
           cancelled_at = CURRENT_TIMESTAMP 
       WHERE order_id = $2;`,
      [reason || 'No reason provided', orderId]
    );

    // 4. Update all Order Items record: set status to Cancelled and record reason
    await client.query(
      `UPDATE order_items 
       SET status = 'Cancelled'::item_status,
           cancellation_reason = $1,
           cancelled_at = CURRENT_TIMESTAMP
       WHERE order_id = $2;`,
      [reason || 'Order cancelled', orderId]
    );

    // 5. System audit logging
    if (staffId) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, target_record, details) 
         VALUES ($1, $2, $3, $4);`,
        [
          staffId,
          'CANCEL_ORDER',
          `orders:${orderId}`,
          `Reason: ${reason || 'No reason provided'}`,
        ]
      );
    }

    // 6. Reset Table status to 'Available' if no active orders remain on it
    const activeOrdersRes = await client.query(
      `SELECT order_id FROM orders 
       WHERE table_id = $1 
         AND status NOT IN ('Paid'::order_status, 'Cancelled'::order_status, 'Completed'::order_status);`,
      [order.table_id]
    );

    if (activeOrdersRes.rows.length === 0) {
      await client.query(
        `UPDATE tables SET status = 'Available'::table_status WHERE table_id = $1;`,
        [order.table_id]
      );
    }

    // 7. Notify affected preparation stations
    for (const row of stationRes.rows) {
      const stationRole = ['Kitchen', 'Bar', 'Hot Drinks'].includes(row.station)
        ? row.station
        : 'Kitchen';

      await createStationNotification(client, {
        recipientRole: stationRole,
        orderId: orderId,
        message: `CANCELLED: Order #${orderId} for Table ${tableNumber} has been cancelled.`,
        expiresMinutes: 60,
      });
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: `Order #${orderId} has been successfully cancelled.`,
      table_id: order.table_id,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('=== CANCEL ORDER TRANSACTION ERROR ===', error);
    return res.status(500).json({
      message: 'Server error while cancelling order.',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/*
|--------------------------------------------------------------------------
| CANCEL SINGLE ORDER ITEM (Schema-safe Recalculation)
|--------------------------------------------------------------------------
*/
const cancelOrderItem = async (req, res) => {
  const client = await pool.connect();

  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const staffId = req.user?.staff_id || req.user?.id;

    if (!orderId || !itemId) {
      return res.status(400).json({
        message: 'Both order ID and item ID are required.',
      });
    }

    await client.query('BEGIN');

    const orderRes = await client.query(
      `
      SELECT order_id, table_id, waiter_id, status
      FROM orders
      WHERE order_id = $1
      FOR UPDATE;
      `,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        message: 'Order ticket not found.',
      });
    }

    const order = orderRes.rows[0];

    if (['Paid', 'Cancelled', 'Completed'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Cannot cancel items for an order with status '${order.status}'.`,
      });
    }

    const itemRes = await client.query(
      `
      SELECT
        oi.id,
        oi.order_id,
        oi.unit_price,
        oi.quantity,
        oi.status,
        oi.station,
        m.name AS item_name
      FROM order_items oi
      JOIN menu_items m
        ON oi.item_id = m.item_id
      WHERE oi.id = $1
        AND oi.order_id = $2
      FOR UPDATE;
      `,
      [itemId, orderId]
    );

    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        message: 'Order item not found in this ticket.',
      });
    }

    const item = itemRes.rows[0];

    if (item.status === 'Cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'Item is already cancelled.',
      });
    }

    const tableRes = await client.query(
      `
      SELECT table_number
      FROM tables
      WHERE table_id = $1;
      `,
      [order.table_id]
    );

    const tableNumber =
      tableRes.rows[0]?.table_number || order.table_id;

    await client.query(
      `
      UPDATE order_items
      SET
        status = 'Cancelled'::item_status,
        cancellation_reason = $1,
        cancelled_at = CURRENT_TIMESTAMP
      WHERE id = $2;
      `,
      [reason || 'Item cancelled by staff', itemId]
    );

    if (staffId) {
      await client.query(
        `
        INSERT INTO audit_logs (
          user_id,
          action,
          target_record,
          details
        )
        VALUES ($1, $2, $3, $4);
        `,
        [
          staffId,
          'CANCEL_ORDER_ITEM',
          `order_items:${itemId}`,
          `Order #${orderId} | Reason: ${reason || 'No reason provided'}`,
        ]
      );
    }

    const totalsRes = await client.query(
      `
      SELECT
        COALESCE(SUM(unit_price * quantity), 0) AS new_subtotal
      FROM order_items
      WHERE order_id = $1
        AND status != 'Cancelled'::item_status;
      `,
      [orderId]
    );

    const newSubtotal = parseFloat(
      totalsRes.rows[0].new_subtotal
    );

    let entireOrderCancelled = false;

    if (newSubtotal === 0) {
      await client.query(
        `
        UPDATE orders
        SET
          status = 'Cancelled'::order_status,
          subtotal = 0.00,
          service_charge = 0.00,
          vat_amount = 0.00,
          total_amount = 0.00,
          cancellation_reason = 'All line items were cancelled',
          cancelled_at = CURRENT_TIMESTAMP
        WHERE order_id = $1;
        `,
        [orderId]
      );

      entireOrderCancelled = true;

      const activeOrdersRes = await client.query(
        `
        SELECT order_id
        FROM orders
        WHERE table_id = $1
          AND status NOT IN (
            'Paid'::order_status,
            'Cancelled'::order_status,
            'Completed'::order_status
          );
        `,
        [order.table_id]
      );

      if (activeOrdersRes.rows.length === 0) {
        await client.query(
          `
          UPDATE tables
          SET status = 'Available'::table_status
          WHERE table_id = $1;
          `,
          [order.table_id]
        );
      }
    } else {
      const newServiceCharge = newSubtotal * 0.10;
      const newTaxableAmount =
        newSubtotal + newServiceCharge;
      const newVat = newTaxableAmount * 0.15;
      const newTotalAmount =
        newTaxableAmount + newVat;

      await client.query(
        `
        UPDATE orders
        SET
          subtotal = $1,
          service_charge = $2,
          vat_amount = $3,
          total_amount = $4
        WHERE order_id = $5;
        `,
        [
          newSubtotal,
          newServiceCharge,
          newVat,
          newTotalAmount,
          orderId,
        ]
      );
    }

    const activeItemsRes = await client.query(
      `
      SELECT status
      FROM order_items
      WHERE order_id = $1
        AND status != 'Cancelled'::item_status;
      `,
      [orderId]
    );

    const activeStatuses = activeItemsRes.rows.map(
      (row) => row.status
    );

    let newOrderStatus = 'Cancelled';

    if (activeStatuses.length > 0) {
      const allActiveReady = activeStatuses.every(
        (itemStatus) =>
          itemStatus === 'Ready' ||
          itemStatus === 'Served'
      );

      const anyActivePreparing = activeStatuses.some(
        (itemStatus) =>
          itemStatus === 'Preparing'
      );

      const anyActivePending = activeStatuses.some(
        (itemStatus) =>
          itemStatus === 'Pending'
      );

      if (allActiveReady) {
        newOrderStatus = 'Ready';
      } else if (anyActivePreparing) {
        newOrderStatus = 'Preparing';
      } else if (anyActivePending) {
        newOrderStatus = 'Pending';
      }
    }

    await client.query(
      `
      UPDATE orders
      SET status = $1::order_status
      WHERE order_id = $2;
      `,
      [newOrderStatus, orderId]
    );

    const stationRole = [
      'Kitchen',
      'Bar',
      'Hot Drinks',
    ].includes(item.station)
      ? item.station
      : 'Kitchen';

    await createStationNotification(client, {
      recipientRole: stationRole,
      orderId: orderId,
      message: `CANCELLED ITEM: ${item.quantity}x ${item.item_name} for Table ${tableNumber} (Order #${orderId}).`,
      expiresMinutes: 60,
    });

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: entireOrderCancelled
        ? `Item cancelled. All items in order #${orderId} are now cancelled; order ticket closed.`
        : `Item #${itemId} successfully cancelled from order #${orderId}.`,
      order_id: orderId,
      item_id: itemId,
      new_subtotal: newSubtotal,
      entire_order_cancelled: entireOrderCancelled,
      order_status: newOrderStatus,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      '=== CANCEL ITEM TRANSACTION ERROR ===',
      error
    );

    return res.status(500).json({
      message: 'Server error while cancelling item.',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createOrder,
  getKitchenOrders: getStationOrders,
  getLiveOrders,
  updateOrderStatus: updateOrderItemStatus,
  requestBill,
  cancelOrder,
  cancelOrderItem,
  dismissStationOrder,
  getStationOrders,
};