const { pool } = require('../config/db');
const VALID_STATION_ROLES = new Set(['Kitchen', 'Bar', 'Hot Drinks']);
/*
|--------------------------------------------------------------------------
| 1. CREATE ORDER (Station Routing, Auto Tax Calculation & Table Occupancy)
|--------------------------------------------------------------------------
*/
const createOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    const { table_id, waiter_id, items } = req.body;

    if (!table_id || !waiter_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Missing required fields: table_id, waiter_id, and items array are required.',
      });
    }

    await client.query('BEGIN');

    // Extract item IDs as strings to support both UUIDs and numeric keys
    const itemIds = items.map((i) => String(i.item_id));

    const dbItemsRes = await client.query(
      `
      SELECT item_id, price, station
      FROM menu_items
      WHERE item_id::text = ANY($1::text[])
      `,
      [itemIds]
    );

    const dbItemsMap = new Map(
      dbItemsRes.rows.map((row) => [
        String(row.item_id),
        { price: parseFloat(row.price), station: row.station || 'Kitchen' },
      ])
    );

    let calculatedSubtotal = 0;
    const stationsSet = new Set(); // Track unique stations involved in this order

    const validatedItems = items.map((item) => {
      const dbItem = dbItemsMap.get(String(item.item_id));

      if (!dbItem) {
        throw new Error(`Menu item ${item.item_id} does not exist in the database.`);
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Invalid quantity for menu item ${item.item_id}.`);
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

    const calculatedServiceCharge = calculatedSubtotal * 0.10;
    const taxableAmount = calculatedSubtotal + calculatedServiceCharge;
    const calculatedVat = taxableAmount * 0.15;
    const calculatedTotal = taxableAmount + calculatedVat;

    // Fetch table_number for clear notification messages
    const tableRes = await client.query(
      `SELECT table_number FROM tables WHERE table_id = $1;`,
      [table_id]
    );
    const tableNumber = tableRes.rows[0]?.table_number || table_id;

    // Insert order header
    const orderQuery = `
      INSERT INTO orders (
        table_id, waiter_id, status, payment_method,
        subtotal, service_charge, vat_amount, total_amount
      )
      VALUES ($1, $2, 'Pending', 'Pending', $3, $4, $5, $6)
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

    // Insert line items
    for (const item of validatedItems) {
      const itemQuery = `
        INSERT INTO order_items (
          order_id, item_id, quantity, unit_price, station, status, note
        )
        VALUES ($1, $2, $3, $4, $5, 'Pending', $6);
      `;

      await client.query(itemQuery, [
        orderId,
        item.item_id,
        item.quantity,
        item.unit_price,
        item.station,
        item.note || '',
      ]);
    }

    // Mark table as Occupied
    await client.query(
      `UPDATE tables SET status = 'Occupied' WHERE table_id = $1;`,
      [table_id]
    );

    // =========================================================================
    // NEW: CREATE NOTIFICATIONS FOR STATIONS (Kitchen, Bar, Hot Drinks)
    // =========================================================================
    for (const station of stationsSet) {
  // Fall back to 'Kitchen' if the station doesn't match an exact ENUM recipient
  const recipientRole = VALID_STATION_ROLES.has(station) ? station : 'Kitchen';

  await client.query(
    `
    INSERT INTO notifications (recipient_role, recipient_id, order_id, message)
    VALUES ($1::notification_recipient, NULL, $2, $3);
    `,
    [
      recipientRole, 
      orderId, 
      `New order #${orderId} received for Table ${tableNumber}.`
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
      message: error.message || 'Database error creating order.',
    });
  } finally {
    client.release();
  }
};

/*
|--------------------------------------------------------------------------
| 2. STATION ORDERS (KDS/Bar Display Views)
|--------------------------------------------------------------------------
*/
const getStationOrders = async (req, res) => {
  try {
    const { station } = req.query;

    let query = `
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
              'note', oi.note
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      JOIN tables t ON o.table_id = t.table_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id ${station ? 'AND oi.station = $1' : ''}
      LEFT JOIN menu_items m ON oi.item_id = m.item_id
      WHERE o.status IN ('Pending', 'Preparing')
    `;

    const queryParams = station ? [station] : [];

    query += `
      GROUP BY o.order_id, t.table_number
      HAVING COUNT(oi.id) > 0
      ORDER BY o.created_at ASC;
    `;

    const { rows } = await pool.query(query, queryParams);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching station orders:', error);
    return res.status(500).json({ message: 'Database error fetching station orders.' });
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
        SUM(o.discount_amount) AS group_discount,
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
      // Find all unpaid orders for this table
      const ordersRes = await client.query(
        `SELECT order_id FROM orders WHERE table_id = $1 AND status NOT IN ('Paid', 'Cancelled') FOR UPDATE;`,
        [targetTableId]
      );
      targetOrderIds = ordersRes.rows.map((o) => o.order_id);
    } else if (orderId && orderId !== 'undefined' && orderId !== 'null') {
      // Find specific order and fetch its table_id
      const orderRes = await client.query(
        `SELECT order_id, table_id FROM orders WHERE order_id = $1 FOR UPDATE;`,
        [orderId]
      );

      if (orderRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Order not found.' });
      }

      targetTableId = orderRes.rows[0].table_id;

      // Fetch all open orders on that table to request group bill
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

    // FIX HERE: Changed $1::uuid[] to $1::int[] (or $1::text[] if using string keys)
    await client.query(
      `UPDATE orders SET status = 'Awaiting_Bill' WHERE order_id = ANY($1::int[]);`,
      [targetOrderIds]
    );

    // 2. Update table status to 'Awaiting_Bill'
    await client.query(
      `UPDATE tables SET status = 'Awaiting_Bill' WHERE table_id = $1;`,
      [targetTableId]
    );

    // 3. Fetch table number for notification display
    const tableRes = await client.query(
      `SELECT table_number FROM tables WHERE table_id = $1;`,
      [targetTableId]
    );
    const tableNum = tableRes.rows[0]?.table_number || targetTableId;

    // 4. Create single notification for Cashier
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
      return res.status(400).json({ message: 'Missing orderItemId or status.' });
    }

    await client.query('BEGIN');

    // 1. Update target order item status with explicit ENUM casting
    const itemUpdateRes = await client.query(
      `
      UPDATE order_items
      SET status = $1::item_status, ready_at = CASE WHEN $1 = 'Ready' THEN NOW() ELSE ready_at END
      WHERE id = $2
      RETURNING order_id, station;
      `,
      [status, orderItemId]
    );

    if (itemUpdateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: `Order item with ID ${orderItemId} not found.` });
    }

    const { order_id, station } = itemUpdateRes.rows[0];

    // 2. Fetch order metadata & all items for this order
    const orderRes = await client.query(
      `SELECT waiter_id, table_id FROM orders WHERE order_id = $1 FOR UPDATE;`,
      [order_id]
    );
    
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Associated order not found.' });
    }

    const { waiter_id, table_id } = orderRes.rows[0];

    const tableRes = await client.query(
      `SELECT table_number FROM tables WHERE table_id = $1;`,
      [table_id]
    );
    const tableNumber = tableRes.rows[0]?.table_number || table_id;

    // 3. CHECK STATION-LEVEL READINESS
    const stationItemsRes = await client.query(
      `SELECT status FROM order_items WHERE order_id = $1 AND station = $2;`,
      [order_id, station]
    );

    const stationStatuses = stationItemsRes.rows.map((r) => r.status);
    const allStationItemsReady = stationStatuses.every((s) => s === 'Ready' || s === 'Served');

    // If item set to 'Ready' and all station items are ready, notify Waiter
    if (status === 'Ready' && allStationItemsReady) {
      const existingNotif = await client.query(
        `
        SELECT notification_id FROM notifications 
        WHERE order_id = $1 AND message LIKE $2;
        `,
        [order_id, `%${station}%`]
      );

      if (existingNotif.rows.length === 0) {
        await client.query(
          `
          INSERT INTO notifications (recipient_role, recipient_id, order_id, message)
          VALUES ('Waiter', $1, $2, $3);
          `,
          [
            waiter_id,
            order_id,
            `[${station}] items for Table ${tableNumber} are Ready for pickup!`
          ]
        );
      }
    }

    // 4. CHECK OVERALL ORDER READINESS
    const allItemsRes = await client.query(
      `SELECT status FROM order_items WHERE order_id = $1;`,
      [order_id]
    );

    const allStatuses = allItemsRes.rows.map((r) => r.status);
    const overallReady = allStatuses.every((s) => s === 'Ready' || s === 'Served');
    const anyPreparing = allStatuses.some((s) => s === 'Preparing' || s === 'Ready');

    let newOrderStatus = 'Pending';
    if (overallReady) newOrderStatus = 'Ready';
    else if (anyPreparing) newOrderStatus = 'Preparing';

    await client.query(
      `UPDATE orders SET status = $1::order_status WHERE order_id = $2;`,
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
    console.error('=== UPDATE ITEM STATUS ERROR ===', error);
    return res.status(500).json({ message: 'Failed to update item status.', error: error.message });
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
};