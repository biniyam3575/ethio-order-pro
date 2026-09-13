const { pool } = require('../config/db');

const getAuditLogs = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      action,
      userId,
      search
    } = req.query;

    const conditions = [];
    const params = [];

    if (startDate) {
      params.push(startDate);
      conditions.push(`a.created_at >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`a.created_at <= $${params.length}`);
    }

    if (action) {
      params.push(action);
      conditions.push(`a.action = $${params.length}`);
    }

    if (userId) {
      params.push(userId);
      conditions.push(`a.user_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`
        (
          a.action ILIKE $${params.length}
          OR a.target_record::text ILIKE $${params.length}
          OR a.details::text ILIKE $${params.length}
          OR s.full_name ILIKE $${params.length}
          OR s.username ILIKE $${params.length}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    const query = `
      SELECT
        a.log_id,
        a.user_id,
        a.action,
        a.target_record,
        a.details,
        a.created_at,
        s.full_name AS staff_name,
        s.username
      FROM audit_logs a
      LEFT JOIN staff s ON a.user_id = s.staff_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT 100
    `;

    const { rows } = await pool.query(query, params);

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get Audit Logs Error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve system audit logs.',
      error: error.message
    });
  }
};

module.exports = {
  getAuditLogs
};