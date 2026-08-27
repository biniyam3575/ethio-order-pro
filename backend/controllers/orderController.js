const { pool } = require('../config/db');

/**
 * Handles creation of new orders and order items in PostgreSQL.
 */
const createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const { table_id, waiter_id, items, subtotal, service_charge, vat_amount, total_amount } = req.body;

    // Validate required payload fields before attempting database insertion
    if (!table_id || !waiter_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Missing required fields: table_id, waiter_id, and at least one order item are required.',
      });
    }

    await client.query('BEGIN');

    // 1. Insert primary order record
    const orderQuery = `
      INSERT INTO orders (table_id, waiter_id, status, subtotal, service_charge, vat_amount, total_amount)
      VALUES ($1, $2, 'Pending', $3, $4, $5, $6)
      RETURNING order_id;
    `;
    const orderValues = [
      table_id,
      waiter_id,
      subtotal || 0,
      service_charge || 0,
      vat_amount || 0,
      total_amount || 0,
    ];

    const orderRes = await client.query(orderQuery, orderValues);
    const orderId = orderRes.rows[0].order_id;

    // 2. Insert line items into order_items table
    for (const item of items) {
      const itemQuery = `
        INSERT INTO order_items (order_id, item_id, quantity, unit_price, note)
        VALUES ($1, $2, $3, $4, $5);
      `;
      await client.query(itemQuery, [
        orderId,
        item.item_id,
        item.quantity,
        item.price,
        item.note || '',
      ]);
    }

    // 3. Mark the assigned table as occupied
    await client.query(`UPDATE tables SET status = 'Occupied' WHERE table_id = $1;`, [table_id]);

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Order created successfully!',
      order_id: orderId,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('=== ORDER CREATION ERROR ===', error);
    return res.status(500).json({
      message: 'Database error creating order.',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createOrder,
};