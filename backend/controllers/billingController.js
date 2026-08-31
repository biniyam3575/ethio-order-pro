const { pool } = require('../config/db');

// Fetch all orders with status 'Awaiting_Bill'
const getAwaitingBillOrders = async (req, res) => {
  try {
    const query = `
      SELECT 
        o.order_id,
        o.table_id,
        t.table_number,
        o.waiter_id,
        s.full_name AS waiter_name,
        o.status,
        o.subtotal,
        o.service_charge,
        o.vat_amount,
        o.total_amount,
        o.discount_amount,
        o.created_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'item_id', oi.item_id,
              'name', m.name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'note', oi.note
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      JOIN tables t ON o.table_id = t.table_id
      JOIN staff s ON o.waiter_id = s.staff_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN menu_items m ON oi.item_id = m.item_id
      WHERE o.status = 'Awaiting_Bill'
      GROUP BY o.order_id, t.table_number, s.full_name
      ORDER BY o.created_at ASC;
    `;

    const { rows } = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching awaiting bill orders:', error);
    return res.status(500).json({ message: 'Database error fetching billing queue.' });
  }
};

// Process payment, clear table, update notifications
const processPayment = async (req, res) => {
  const client = await pool.connect();
  try {
    const { orderId } = req.params;
    const { payment_method, payment_ref, discount_amount } = req.body;
    const staff_id = req.user?.staff_id;

    if (!staff_id) {
      return res.status(401).json({ message: 'Unauthorized: Staff session required.' });
    }

    const validMethods = ['Cash', 'Telebirr', 'CBE_Birr'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ message: 'Invalid payment method selected.' });
    }

    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT order_id, table_id, total_amount FROM orders WHERE order_id = $1 FOR UPDATE;`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = orderRes.rows[0];
    const discount = parseFloat(discount_amount) || 0.00;
    const finalTotal = Math.max(0, parseFloat(order.total_amount) - discount);

    await client.query(
      `
      UPDATE orders
      SET status = 'Paid',
          payment_method = $1,
          payment_ref = $2,
          cashier_id = $3,
          discount_amount = $4,
          total_amount = $5,
          paid_at = NOW()
      WHERE order_id = $6;
      `,
      [payment_method, payment_ref || null, staff_id, discount, finalTotal, orderId]
    );

    await client.query(`UPDATE tables SET status = 'Available' WHERE table_id = $1;`, [order.table_id]);

    await client.query(
      `UPDATE notifications SET is_read = TRUE WHERE order_id = $1 AND (recipient_role = 'Cashier' OR recipient_role = 'All');`,
      [orderId]
    );

    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: 'Payment finalized successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Payment processing failed.', error: error.message });
  } finally {
    client.release();
  }
};

module.exports = { getAwaitingBillOrders, processPayment };