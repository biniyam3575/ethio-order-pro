const { pool } = require('../config/db');

// POST /api/v1/discounts/request - Waiter submits a discount request
const requestDiscount = async (req, res) => {
  const waiterId = req.user.staff_id || req.user.user_id;
  const { order_id, discount_amount, reason } = req.body;

  if (!order_id || !discount_amount || parseFloat(discount_amount) <= 0) {
    return res.status(400).json({ message: 'Valid order_id and discount_amount are required.' });
  }

  try {
    // Check if order exists and is not yet paid
    const orderCheck = await pool.query(
      `SELECT order_id, total_amount, status FROM orders WHERE order_id = $1 AND status NOT IN ('Paid', 'Cancelled');`,
      [order_id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Active unpaid order not found.' });
    }

    const order = orderCheck.rows[0];
    if (parseFloat(discount_amount) > parseFloat(order.total_amount)) {
      return res.status(400).json({ message: 'Discount amount cannot exceed order total amount.' });
    }

    const insertQuery = `
      INSERT INTO discount_requests (order_id, requested_by, discount_amount, reason, status)
      VALUES ($1, $2, $3, $4, 'Pending')
      RETURNING *;
    `;

    const { rows } = await pool.query(insertQuery, [order_id, waiterId, discount_amount, reason || '']);

    // Notify Managers
    await pool.query(
      `INSERT INTO notifications (recipient_role, recipient_id, order_id, message)
       VALUES ('Manager', NULL, $1, $2);`,
      [order_id, `Discount request of ETB ${discount_amount} submitted for Order #${order_id}.`]
    );

    return res.status(201).json({ success: true, message: 'Discount request submitted for approval.', data: rows[0] });
  } catch (error) {
    console.error('Request Discount Error:', error);
    return res.status(500).json({ message: 'Failed to submit discount request.' });
  }
};

// GET /api/v1/discounts/pending - Fetch pending requests for Manager review
const getPendingDiscounts = async (req, res) => {
  try {
    const query = `
      SELECT 
        d.id, d.order_id, d.discount_amount, d.reason, d.status, d.created_at,
        s.full_name AS requested_by_name,
        o.table_id,
        t.table_number,
        o.subtotal,
        o.total_amount AS order_total
      FROM discount_requests d
      JOIN staff s ON d.requested_by = s.staff_id
      JOIN orders o ON d.order_id = o.order_id
      JOIN tables t ON o.table_id = t.table_id
      WHERE d.status = 'Pending'
      ORDER BY d.created_at ASC;
    `;
    const { rows } = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get Pending Discounts Error:', error);
    return res.status(500).json({ message: 'Failed to retrieve discount requests.' });
  }
};

// PUT /api/v1/discounts/:id/review - Manager approves or rejects
const reviewDiscountRequest = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'Approved' or 'Rejected'
  const reviewerId = req.user.staff_id || req.user.user_id;

  if (!['Approved', 'Rejected'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Must be "Approved" or "Rejected".' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock and update discount request
    const updateDiscountQuery = `
      UPDATE discount_requests
      SET status = $1::discount_status, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status = 'Pending'
      RETURNING *;
    `;
    const discountRes = await client.query(updateDiscountQuery, [action, reviewerId, id]);

    if (discountRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Pending discount request not found.' });
    }

    const discountRecord = discountRes.rows[0];

    // 2. If approved, recalculate order tax sequence with discount
    if (action === 'Approved') {
      const orderRes = await client.query(
        `SELECT subtotal FROM orders WHERE order_id = $1 FOR UPDATE;`,
        [discountRecord.order_id]
      );

      if (orderRes.rows.length > 0) {
        const rawSubtotal = parseFloat(orderRes.rows[0].subtotal || 0);
        const discountVal = parseFloat(discountRecord.discount_amount || 0);

        const discountedSubtotal = Math.max(0, rawSubtotal - discountVal);
        const serviceCharge = discountedSubtotal * 0.10;
        const taxableAmount = discountedSubtotal + serviceCharge;
        const vatAmount = taxableAmount * 0.15;
        const newTotal = taxableAmount + vatAmount;

        await client.query(
          `
          UPDATE orders
          SET discount_amount = $1,
              discount_by = $2,
              service_charge = $3,
              vat_amount = $4,
              total_amount = $5
          WHERE order_id = $6;
          `,
          [discountVal, reviewerId, serviceCharge, vatAmount, newTotal, discountRecord.order_id]
        );
      }
    }

    // 3. Log Audit Record
    await client.query(
      `
      INSERT INTO audit_logs (user_id, action, target_record, details)
      VALUES ($1, $2, $3, $4);
      `,
      [
        reviewerId,
        `DISCOUNT_${action.toUpperCase()}`,
        `DiscountRequest #${id}`,
        `Order #${discountRecord.order_id} discount ${action.toLowerCase()} for amount ETB ${discountRecord.discount_amount}`
      ]
    );

    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: `Discount request ${action.toLowerCase()} successfully.` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Review Discount Error:', error);
    return res.status(500).json({ message: 'Failed to process discount review.' });
  } finally {
    client.release();
  }
};

module.exports = {
  requestDiscount,
  getPendingDiscounts,
  reviewDiscountRequest,
};