const { pool } = require('../config/db');

// GET /api/v1/discounts/pending - Fetch all pending discount approval requests
const getPendingDiscounts = async (req, res) => {
  try {
    const query = `
      SELECT 
        d.id, d.order_id, d.discount_amount, d.reason, d.status, d.created_at,
        s.full_name AS requested_by_name,
        o.total_amount AS order_total
      FROM discount_requests d
      JOIN staff s ON d.requested_by = s.staff_id
      JOIN orders o ON d.order_id = o.order_id
      WHERE d.status::text = 'Pending'
      ORDER BY d.created_at ASC
    `;
    const { rows } = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get Pending Discounts Error:', error);
    return res.status(500).json({ message: 'Failed to retrieve discount requests.' });
  }
};

// PUT /api/v1/discounts/:id/review - Approve or Reject discount request
const reviewDiscountRequest = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // Expects 'Approved' or 'Rejected'
  const reviewerId = req.user.staff_id;

  if (!['Approved', 'Rejected'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Must be "Approved" or "Rejected".' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Update discount request
    const updateDiscountQuery = `
      UPDATE discount_requests
      SET status = $1::discount_status, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const discountRes = await client.query(updateDiscountQuery, [action, reviewerId, id]);

    if (discountRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Discount request not found.' });
    }

    const discountRecord = discountRes.rows[0];

    // 2. If approved, apply discount to order record
    if (action === 'Approved') {
      await client.query(`
        UPDATE orders
        SET discount_amount = $1,
            discount_by = $2,
            total_amount = GREATEST(0, subtotal + service_charge + vat_amount - $1)
        WHERE order_id = $3
      `, [discountRecord.discount_amount, reviewerId, discountRecord.order_id]);
    }

    // 3. Log Audit Record
    await client.query(`
      INSERT INTO audit_log (staff_id, action, entity_type, entity_id, details)
      VALUES ($1, $2, 'discount_requests', $3, $4::jsonb)
    `, [reviewerId, `DISCOUNT_${action.toUpperCase()}`, id, JSON.stringify(discountRecord)]);

    await client.query('COMMIT');
    return res.status(200).json({ message: `Discount request ${action.toLowerCase()} successfully.` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Review Discount Error:', error);
    return res.status(500).json({ message: 'Failed to process discount review.' });
  } finally {
    client.release();
  }
};

module.exports = {
  getPendingDiscounts,
  reviewDiscountRequest,
};