const { pool } = require('../config/db');

// GET /api/v1/audit - View system audit log (Owner Only)
const getAuditLogs = async (req, res) => {
  try {
    const query = `
      SELECT 
        a.log_id, 
        a.action, 
        a.target_record, 
        a.details, 
        a.created_at,
        s.full_name AS staff_name, 
        s.username
      FROM audit_logs a
      LEFT JOIN staff s ON a.user_id = s.staff_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `;
    const { rows } = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get Audit Logs Error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve system audit logs.',
      error: error.message 
    });
  }
};

module.exports = { getAuditLogs };