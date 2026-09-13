// controllers/reportController.js
const { pool } = require('../config/db');

/*
|--------------------------------------------------------------------------
| 1. GET /api/v1/reports/summary - Advanced Sales Analytics
|--------------------------------------------------------------------------
*/
const getSalesSummary = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const queryParams = [];
    let dateWhereClause = "";

    if (startDate && endDate) {
      queryParams.push(startDate, `${endDate} 23:59:59`);
      dateWhereClause = ` AND o.created_at BETWEEN $1 AND $2`;
    }

    // Core Metrics
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT o.order_id) AS total_orders,
        COALESCE(SUM(o.subtotal), 0) AS gross_subtotal,
        COALESCE(SUM(o.vat_amount), 0) AS total_vat,
        COALESCE(SUM(o.service_charge), 0) AS total_service_charges,
        COALESCE(SUM(o.total_amount), 0) AS total_revenue,
        COALESCE(AVG(o.total_amount), 0) AS avg_order_value
      FROM orders o
      WHERE o.status::text IN ('Paid', 'Completed') ${dateWhereClause};
    `;

    // Payment Methods Breakdown
    const paymentMethodsQuery = `
      SELECT 
        o.payment_method::text AS payment_method, 
        COUNT(o.order_id) AS order_count, 
        COALESCE(SUM(o.total_amount), 0) AS total_collected
      FROM orders o
      WHERE o.status::text IN ('Paid', 'Completed') ${dateWhereClause}
      GROUP BY o.payment_method;
    `;

    // Top Selling Items
    const topItemsQuery = `
      SELECT 
        m.item_id,
        m.name, 
        m.category,
        COALESCE(m.station, oi.station, 'Kitchen') AS station,
        SUM(oi.quantity)::INT AS total_quantity,
        SUM(oi.quantity * oi.unit_price) AS total_sales
      FROM order_items oi
      JOIN menu_items m ON oi.item_id = m.item_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status::text IN ('Paid', 'Completed') ${dateWhereClause}
      GROUP BY m.item_id, m.name, m.category, m.station, oi.station
      ORDER BY total_quantity DESC
      LIMIT 5;
    `;

    const summaryRes = await pool.query(summaryQuery, queryParams);
    const paymentRes = await pool.query(paymentMethodsQuery, queryParams);
    const topItemsRes = await pool.query(topItemsQuery, queryParams);

    return res.status(200).json({
      metrics: summaryRes.rows[0] || {},
      paymentBreakdown: paymentRes.rows || [],
      topItems: topItemsRes.rows || [],
    });
  } catch (error) {
    console.error('Report Controller Error:', error);
    return res.status(500).json({ message: 'Failed to generate sales report.' });
  }
};

/*
|--------------------------------------------------------------------------
| 2. GET /api/v1/reports/station-reconciliation - Station Production vs Collections
|--------------------------------------------------------------------------
*/
const getStationReconciliation = async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'startDate and endDate query parameters are required.' });
  }

  try {
    const formattedEndDate = `${endDate} 23:59:59`;

    const query = `
      SELECT 
        COALESCE(m.station, oi.station, 'Kitchen') AS station,
        SUM(oi.quantity * oi.unit_price) AS gross_production_value,
        SUM(CASE WHEN o.status::text IN ('Paid', 'Completed') THEN (oi.quantity * oi.unit_price) ELSE 0.00 END) AS actual_collected,
        (
          SUM(oi.quantity * oi.unit_price) - 
          SUM(CASE WHEN o.status::text IN ('Paid', 'Completed') THEN (oi.quantity * oi.unit_price) ELSE 0.00 END)
        ) AS revenue_deficit
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      LEFT JOIN menu_items m ON oi.item_id = m.item_id
      WHERE o.created_at BETWEEN $1 AND $2
      GROUP BY COALESCE(m.station, oi.station, 'Kitchen')
      ORDER BY station;
    `;

    const { rows } = await pool.query(query, [startDate, formattedEndDate]);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Reconciliation Report Error:', error);
    return res.status(500).json({ message: 'Failed to generate station reconciliation report.' });
  }
};

module.exports = {
  getSalesSummary,
  getStationReconciliation,
};