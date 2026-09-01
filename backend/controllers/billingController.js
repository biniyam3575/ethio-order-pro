const { pool } = require('../config/db');

/**
 * Fetch grouped bill requests by table (Consolidated Table Billing)
 * Returns all active orders with 'Awaiting_Bill' status along with line items.
 */
const getAwaitingBillOrders = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.table_id,
        t.table_number,
        t.section,
        s.full_name AS waiter_name,
        ARRAY_AGG(o.order_id) AS order_ids,
        COUNT(DISTINCT o.order_id)::int AS total_orders_count,
        SUM(o.subtotal) AS total_subtotal,
        SUM(o.service_charge) AS total_service_charge,
        SUM(o.vat_amount) AS total_vat,
        SUM(o.discount_amount) AS total_discount,
        SUM(o.total_amount) AS group_total_amount,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'order_id', o.order_id,
              'created_at', o.created_at,
              'items', items_by_order.items
            )
          ), '[]'
        ) AS orders_breakdown
      FROM tables t
      JOIN orders o ON t.table_id = o.table_id
      LEFT JOIN staff s ON o.waiter_id = s.staff_id
      LEFT JOIN LATERAL (
        SELECT 
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'item_id', oi.item_id,
              'name', m.name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'note', oi.note
            )
          ) AS items
        FROM order_items oi
        JOIN menu_items m ON oi.item_id = m.item_id
        WHERE oi.order_id = o.order_id
      ) items_by_order ON TRUE
      WHERE o.status = 'Awaiting_Bill'
      GROUP BY t.table_id, t.table_number, t.section, s.full_name
      ORDER BY MIN(o.created_at) ASC;
    `;

    const { rows } = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching awaiting bill orders:', error);
    return res.status(500).json({ message: 'Database error fetching billing queue.' });
  }
};

/**
 * Process payment for an ENTIRE TABLE
 * Settles all table orders, saves the fiscal machine receipt number, computes exact cash change, 
 * resets table availability, and logs tax audit figures.
 */
const processPayment = async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      tableId, 
      payment_method, 
      payment_ref, 
      discount_amount, 
      cash_received, 
      fiscal_receipt_no 
    } = req.body;
    
    // Fallback check for staff ID across token payloads
    const staff_id = req.user?.staff_id || req.user?.user_id;

    if (!staff_id) {
      return res.status(401).json({ message: 'Unauthorized: Staff session required.' });
    }

    if (!tableId) {
      return res.status(400).json({ message: 'Table ID is required to process table payment.' });
    }

    const validMethods = ['Cash', 'Telebirr', 'CBE_Birr', 'CBE Birr'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ message: 'Invalid payment method selected.' });
    }

    await client.query('BEGIN');

    // 1. Lock and fetch all orders awaiting bill for this table, including tax breakdowns
    const ordersRes = await client.query(
      `SELECT order_id, subtotal, service_charge, vat_amount, total_amount 
       FROM orders 
       WHERE table_id = $1 AND status = 'Awaiting_Bill' 
       FOR UPDATE;`,
      [tableId]
    );

    if (ordersRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'No billable orders found for this table.' });
    }

    // Cast IDs to string array to safely handle both UUID and INT primary key types
    const orderIds = ordersRes.rows.map(o => String(o.order_id));

    // Calculate aggregated financial metrics
    const totalSubtotal = ordersRes.rows.reduce((sum, o) => sum + parseFloat(o.subtotal || 0), 0);
    const totalServiceCharge = ordersRes.rows.reduce((sum, o) => sum + parseFloat(o.service_charge || 0), 0);
    const totalVat = ordersRes.rows.reduce((sum, o) => sum + parseFloat(o.vat_amount || 0), 0);
    const groupTotal = ordersRes.rows.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    
    const globalDiscount = parseFloat(discount_amount) || 0.00;
    const finalGrandTotal = Math.max(0, groupTotal - globalDiscount);

    const cashGiven = parseFloat(cash_received) || 0.00;
    const changeGiven = payment_method === 'Cash' ? Math.max(0, cashGiven - finalGrandTotal) : 0.00;

    // 2. Mark all targeted table orders as Paid
    // Using order_id::text = ANY($7::text[]) prevents Postgres type-casting crashes (INT vs UUID)
    await client.query(
      `
      UPDATE orders
      SET status = 'Paid',
          payment_method = $1,
          payment_ref = $2,
          cashier_id = $3,
          cash_received = $4,
          change_given = $5,
          fiscal_receipt_no = $6,
          paid_at = NOW()
      WHERE order_id::text = ANY($7::text[]);
      `,
      [
        payment_method, 
        payment_ref || null, 
        staff_id, 
        cashGiven, 
        changeGiven, 
        fiscal_receipt_no || null, 
        orderIds
      ]
    );

    // 3. Set Table to Available if no active orders remain
    const remainingOrdersRes = await client.query(
      `SELECT COUNT(*)::int AS active_count 
       FROM orders 
       WHERE table_id = $1 AND status NOT IN ('Paid', 'Cancelled');`,
      [tableId]
    );

    if (parseInt(remainingOrdersRes.rows[0].active_count) === 0) {
      await client.query(
        `UPDATE tables SET status = 'Available', assigned_waiter_id = NULL WHERE table_id = $1;`, 
        [tableId]
      );
    }

    // 4. Dismiss cashier notifications for these orders
    await client.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE order_id::text = ANY($1::text[]) AND (recipient_role = 'Cashier' OR recipient_role = 'All');`,
      [orderIds]
    );

    // 5. Log audit record for cashier/manager tax matching & reconciliation
    const auditDetails = `Fiscal #: ${fiscal_receipt_no || 'N/A'} | Subtotal: ${totalSubtotal.toFixed(2)} ETB | Service (10%): ${totalServiceCharge.toFixed(2)} ETB | VAT (15%): ${totalVat.toFixed(2)} ETB | Discount: ${globalDiscount.toFixed(2)} ETB | Net Total: ${finalGrandTotal.toFixed(2)} ETB | Method: ${payment_method}`;

    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_record, details)
       VALUES ($1, 'TABLE_PAYMENT_PROCESSED', $2, $3);`,
      [staff_id, `Table #${tableId}`, auditDetails]
    );

    await client.query('COMMIT');

    return res.status(200).json({ 
      success: true, 
      message: 'Table payment finalized and fiscal tax record saved successfully.',
      change_given: changeGiven,
      audit: {
        table_id: tableId,
        orders_cleared: orderIds,
        subtotal: totalSubtotal,
        service_charge: totalServiceCharge,
        vat_amount: totalVat,
        grand_total: finalGrandTotal,
        cash_received: cashGiven,
        change_given: changeGiven,
        fiscal_receipt_no: fiscal_receipt_no || 'N/A'
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment settlement error:', error);
    return res.status(500).json({ message: 'Payment processing failed.', error: error.message });
  } finally {
    client.release();
  }
};

module.exports = { getAwaitingBillOrders, processPayment };