const { pool } = require('../config/db');


/**
 * Fetch grouped bill requests by table
 *
 * Only a cashier with an active shift can access
 * the billing queue.
 */
const getAwaitingBillOrders = async (req, res) => {
  try {
    const cashierId = req.user?.staff_id || req.user?.user_id;

    if (!cashierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Cashier session required.'
      });
    }

    // ------------------------------------------------------------
    // Check cashier shift
    // ------------------------------------------------------------
    const shiftRes = await pool.query(
      `
      SELECT shift_id
      FROM cashier_shifts
      WHERE cashier_id = $1
        AND status = 'Open'
      LIMIT 1;
      `,
      [cashierId]
    );

    // IMPORTANT:
    // A closed shift is NOT a server error.
    // Simply return an empty queue.
    if (shiftRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        shift_open: false,
        message: 'Your cashier shift is closed. Open a shift to view and process bills.',
        data: []
      });
    }

    // ------------------------------------------------------------
    // Fetch awaiting bills
    // ------------------------------------------------------------
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

        SUM(o.total_amount) AS group_total_amount,

        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'order_id', o.order_id,
              'created_at', o.created_at,
              'items', items_by_order.items
            )
          ),
          '[]'
        ) AS orders_breakdown

      FROM tables t

      JOIN orders o
        ON t.table_id = o.table_id

      LEFT JOIN staff s
        ON o.waiter_id = s.staff_id

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

        JOIN menu_items m
          ON oi.item_id = m.item_id

        WHERE oi.order_id = o.order_id

      ) items_by_order ON TRUE

      WHERE o.status = 'Awaiting_Bill'

      GROUP BY 
        t.table_id,
        t.table_number,
        t.section,
        s.full_name

      ORDER BY MIN(o.created_at) ASC;
    `;

    const { rows } = await pool.query(query);

    return res.status(200).json({
      success: true,
      shift_open: true,
      data: rows
    });

  } catch (error) {
    console.error('Error fetching awaiting bill orders:', error);

    return res.status(500).json({
      success: false,
      message: 'Database error fetching billing queue.'
    });
  }
};

/**
 * Process payment for an ENTIRE TABLE
 *
 * Protection:
 * - Cashier must have an active shift.
 * - Payment is associated with the logged-in cashier.
 * - Cash is added to that exact active shift.
 * - Only this cashier's billing notifications are cleared.
 */
const processPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      tableId,
      payment_method,
      payment_ref,
      cash_received,
      fiscal_receipt_no
    } = req.body;

    const staff_id = req.user?.staff_id || req.user?.user_id;

    if (!staff_id) {
      return res.status(401).json({
        message: 'Unauthorized: Staff session required.'
      });
    }

    if (!tableId) {
      return res.status(400).json({
        message: 'Table ID is required to process table payment.'
      });
    }

    const validMethods = [
      'Cash',
      'Telebirr',
      'CBE_Birr',
      'CBE Birr',
      'Card'
    ];

    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({
        message: 'Invalid payment method selected.'
      });
    }

    await client.query('BEGIN');


    // ============================================================
    // 1. VERIFY ACTIVE SHIFT
    // ============================================================

    const shiftRes = await client.query(
      `
      SELECT
        shift_id,
        cashier_id,
        opening_cash,
        expected_cash
      FROM cashier_shifts
      WHERE cashier_id = $1
        AND status = 'Open'
      FOR UPDATE;
      `,
      [staff_id]
    );

    if (shiftRes.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'You do not have an active cashier shift. Please open your shift before processing payments.'
      });
    }

    const currentShift = shiftRes.rows[0];
    const shiftId = currentShift.shift_id;


    // ============================================================
    // 2. FETCH ACTIVE UNPAID ORDERS FOR THIS TABLE
    // ============================================================

    const ordersRes = await client.query(
      `
      SELECT
        order_id,
        subtotal,
        service_charge,
        vat_amount,
        total_amount
      FROM orders
      WHERE table_id = $1
        AND status = 'Awaiting_Bill'
      FOR UPDATE;
      `,
      [tableId]
    );

    if (ordersRes.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: 'No billable orders found for this table.'
      });
    }

    const orderIds = ordersRes.rows.map(o => o.order_id);


    // ============================================================
    // 3. CALCULATE TOTALS FROM DATABASE
    // ============================================================

    const totalSubtotal = ordersRes.rows.reduce(
      (sum, o) => sum + parseFloat(o.subtotal || 0),
      0
    );

    const totalServiceCharge = ordersRes.rows.reduce(
      (sum, o) => sum + parseFloat(o.service_charge || 0),
      0
    );

    const totalVat = ordersRes.rows.reduce(
      (sum, o) => sum + parseFloat(o.vat_amount || 0),
      0
    );

    const finalGrandTotal = ordersRes.rows.reduce(
      (sum, o) => sum + parseFloat(o.total_amount || 0),
      0
    );


    // ============================================================
    // 4. CASH / CHANGE CALCULATION
    // ============================================================

    const cashGiven = parseFloat(cash_received) || 0.00;

    const changeGiven =
      payment_method === 'Cash'
        ? Math.max(0, cashGiven - finalGrandTotal)
        : 0.00;


    if (payment_method === 'Cash' && cashGiven < finalGrandTotal) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        message: `Insufficient cash provided. Amount due is ETB ${finalGrandTotal.toFixed(2)}.`
      });
    }


    // ============================================================
    // 5. CLEAN PAYMENT REFERENCES
    // ============================================================

    const refValue =
      payment_ref && payment_ref.trim() !== ''
        ? payment_ref.trim()
        : null;

    const fiscalValue =
      fiscal_receipt_no && fiscal_receipt_no.trim() !== ''
        ? fiscal_receipt_no.trim()
        : null;


    // ============================================================
    // 6. MARK ORDERS AS PAID
    // ============================================================

    await client.query(
      `
      UPDATE orders
      SET
        status = 'Paid',
        payment_method = $1,
        payment_ref = $2,
        cashier_id = $3,
        cash_received = $4,
        change_given = $5,
        fiscal_receipt_no = $6,
        paid_at = NOW()
      WHERE order_id = ANY($7::int[]);
      `,
      [
        payment_method,
        refValue,
        staff_id,
        cashGiven,
        changeGiven,
        fiscalValue,
        orderIds
      ]
    );


    // ============================================================
    // 7. UPDATE EXACT ACTIVE CASHIER SHIFT
    // ============================================================

    if (payment_method === 'Cash') {
      await client.query(
        `
        UPDATE cashier_shifts
        SET expected_cash = expected_cash + $1
        WHERE shift_id = $2;
        `,
        [
          finalGrandTotal,
          shiftId
        ]
      );
    }


    // ============================================================
    // 8. FREE TABLE WHEN NO ACTIVE ORDERS REMAIN
    // ============================================================

    const remainingOrdersRes = await client.query(
      `
      SELECT COUNT(*)::int AS active_count
      FROM orders
      WHERE table_id = $1
        AND status NOT IN ('Paid', 'Cancelled');
      `,
      [tableId]
    );

    if (parseInt(remainingOrdersRes.rows[0].active_count) === 0) {
      await client.query(
        `
        UPDATE tables
        SET
          status = 'Available',
          assigned_waiter_id = NULL
        WHERE table_id = $1;
        `,
        [tableId]
      );
    }


    // ============================================================
    // 9. CLEAR ONLY THIS CASHIER'S BILL NOTIFICATIONS
    // ============================================================

    /*
     * IMPORTANT:
     *
     * Do NOT mark every notification for this order as read.
     *
     * Otherwise paying a bill could also clear:
     * - Kitchen notifications
     * - Bar notifications
     * - Hot Drinks notifications
     * - Waiter notifications
     *
     * We only clear the Cashier notification belonging
     * to the cashier who processed this payment.
     */

    await client.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE order_id = ANY($1::int[])
        AND recipient_role = 'Cashier'
        AND recipient_id = $2
        AND is_read = FALSE;
      `,
      [
        orderIds,
        staff_id
      ]
    );


    // ============================================================
    // 10. AUDIT LOGGING
    // ============================================================

    const auditDetails =
      `Fiscal #: ${fiscalValue || 'N/A'} | ` +
      `Subtotal: ${totalSubtotal.toFixed(2)} ETB | ` +
      `Service: ${totalServiceCharge.toFixed(2)} ETB | ` +
      `VAT: ${totalVat.toFixed(2)} ETB | ` +
      `Final Net: ${finalGrandTotal.toFixed(2)} ETB | ` +
      `Method: ${payment_method}`;


    await client.query(
      `
      INSERT INTO audit_logs
        (user_id, action, target_record, details)
      VALUES
        ($1, 'TABLE_PAYMENT_PROCESSED', $2, $3);
      `,
      [
        staff_id,
        `Table #${tableId}`,
        auditDetails
      ]
    );


    // ============================================================
    // 11. COMMIT
    // ============================================================

    await client.query('COMMIT');


    // ============================================================
    // 12. RESPONSE
    // ============================================================

    return res.status(200).json({
      success: true,

      message: 'Payment processed and stored in settlement history.',

      data: {
        table_id: tableId,
        order_ids: orderIds,

        payment_method,
        payment_ref: refValue,
        fiscal_receipt_no: fiscalValue,

        subtotal: totalSubtotal,
        service_charge: totalServiceCharge,
        vat_amount: totalVat,
        grand_total: finalGrandTotal,

        cash_received: cashGiven,
        change_given: changeGiven,

        cashier_id: staff_id,
        shift_id: shiftId,

        paid_at: new Date()
      }
    });

  } catch (error) {

    await client.query('ROLLBACK');

    console.error('Payment settlement error:', error);

    return res.status(500).json({
      message: 'Payment processing failed.',
      error: error.message
    });

  } finally {
    client.release();
  }
};


/**
 * Fetch Payment & Settlement History
 *
 * A cashier only sees their own payment history.
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { date } = req.query;

    const staff_id = req.user?.staff_id || req.user?.user_id;

    if (!staff_id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Staff session required.'
      });
    }


    let dateFilterClause = '';
    const queryParams = [];


    if (date) {

      dateFilterClause = `
        WHERE o.status = $1
          AND o.cashier_id = $2
          AND o.paid_at::date = $3::date
      `;

      queryParams.push(
        'Paid',
        staff_id,
        date
      );

    } else {

      dateFilterClause = `
        WHERE o.status = $1
          AND o.cashier_id = $2
          AND o.paid_at::date = CURRENT_DATE
      `;

      queryParams.push(
        'Paid',
        staff_id
      );
    }


    const query = `
      SELECT

        o.table_id,

        t.table_number,

        o.paid_at,

        o.payment_method,

        o.payment_ref,

        o.fiscal_receipt_no,

        s_cashier.full_name AS cashier_name,

        s_waiter.full_name AS waiter_name,

        STRING_AGG(
          '#' || o.order_id::text,
          ', '
          ORDER BY o.order_id
        ) AS aggregated_order_ids,

        SUM(o.total_amount) AS total_amount,

        SUM(o.subtotal) AS subtotal,

        SUM(o.service_charge) AS service_charge,

        SUM(o.vat_amount) AS vat_amount

      FROM orders o

      JOIN tables t
        ON o.table_id = t.table_id

      LEFT JOIN staff s_cashier
        ON o.cashier_id = s_cashier.staff_id

      LEFT JOIN staff s_waiter
        ON o.waiter_id = s_waiter.staff_id

      ${dateFilterClause}

      GROUP BY

        o.table_id,

        t.table_number,

        o.paid_at,

        o.payment_method,

        o.payment_ref,

        o.fiscal_receipt_no,

        s_cashier.full_name,

        s_waiter.full_name

      ORDER BY o.paid_at DESC;
    `;


    const { rows } = await pool.query(
      query,
      queryParams
    );


    return res.status(200).json({
      success: true,
      data: rows
    });

  } catch (error) {

    console.error('Get Payment History Error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve payment history.'
    });
  }
};


module.exports = {
  getAwaitingBillOrders,
  processPayment,
  getPaymentHistory
};