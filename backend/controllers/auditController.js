const { pool } = require('../config/db');

// GET /api/v1/audit - View system audit log (Owner Only)
const getAuditLogs = async (req, res) => {
  try {
    const query = `
      SELECT 
        a.log_id, a.action, a.entity_type, a.entity_id, a.details, a.ip_address, a.created_at,
        s.full_name AS staff_name, s.username
      FROM audit_log a
      LEFT JOIN staff s ON a.staff_id = s.staff_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `;
    const { rows } = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get Audit Logs Error:', error);
    return res.status(500).json({ message: 'Failed to retrieve system audit logs.' });
  }
};

module.exports = { getAuditLogs };