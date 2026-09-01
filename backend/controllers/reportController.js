const { pool } = require('../config/db');

// GET /api/v1/reports/summary - Advanced Sales Analytics
const getSalesSummary = async (req, res) => {
  try {
    // 1. Core Totals
    const summaryQuery = `
      SELECT 
        COUNT(order_id) AS total_orders,
        COALESCE(SUM(subtotal), 0) AS gross_subtotal,
        COALESCE(SUM(discount_amount), 0) AS total_discounts,
        COALESCE(SUM(vat_amount), 0) AS total_vat,
        COALESCE(SUM(service_charge), 0) AS total_service_charges,
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COALESCE(AVG(total_amount), 0) AS avg_order_value
      FROM orders
      WHERE status::text IN ('Paid', 'Completed');
    `;

    // 2. Breakdown by Payment Method
    const paymentMethodsQuery = `
      SELECT 
        payment_method, 
        COUNT(order_id) AS order_count, 
        COALESCE(SUM(total_amount), 0) AS total_collected
      FROM orders
      WHERE status::text IN ('Paid', 'Completed')
      GROUP BY payment_method;
    `;

    // 3. Top 5 selling items
    const topItemsQuery = `
      SELECT 
        m.name, 
        m.category,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi.quantity * oi.unit_price) AS total_sales
      FROM order_items oi
      JOIN menu_items m ON oi.item_id = m.item_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status::text IN ('Paid', 'Completed')
      GROUP BY m.name, m.category
      ORDER BY total_quantity DESC
      LIMIT 5;
    `;

    const summaryRes = await pool.query(summaryQuery);
    const paymentRes = await pool.query(paymentMethodsQuery);
    const topItemsRes = await pool.query(topItemsQuery);

    return res.status(200).json({
      metrics: summaryRes.rows[0],
      paymentBreakdown: paymentRes.rows,
      topItems: topItemsRes.rows,
    });
  } catch (error) {
    console.error('Report Controller Error:', error);
    return res.status(500).json({ message: 'Failed to generate sales report.' });
  }
};

module.exports = { getSalesSummary };