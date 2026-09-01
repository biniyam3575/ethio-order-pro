const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// GET /api/v1/staff - Fetch all employees except the Owner
const getAllStaff = async (req, res) => {
  try {
    const query = `
      SELECT 
        s.staff_id, 
        s.full_name, 
        s.username, 
        s.phone, 
        s.status, 
        s.created_at,
        s.created_by,
        ARRAY_AGG(r.role) AS roles
      FROM staff s
      LEFT JOIN staff_roles r ON s.staff_id = r.staff_id
      GROUP BY s.staff_id
      HAVING NOT ('Owner' = ANY(ARRAY_AGG(r.role))) -- Excludes Owner from the roster
      ORDER BY s.created_at DESC
    `;
    const { rows } = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get Staff Error:', error);
    return res.status(500).json({ message: 'Failed to retrieve staff records.' });
  }
};

// PUT /api/v1/staff/:id/status
const updateStaffStatus = async (req, res) => {
  const targetId = parseInt(req.params.id);
  const currentUserId = req.user.staff_id; // Set by auth Middleware

  if (targetId === currentUserId) {
    return res.status(400).json({ 
      message: "You cannot deactivate your own active account." 
    });
  }

  // Proceed with DB update...
};


// POST /api/v1/staff - Create new staff account
const createStaff = async (req, res) => {
  const { full_name, username, password, phone, role } = req.body;
  const creatorRoles = req.user?.roles || [];
  const creatorId = req.user?.staff_id;

  if (!full_name || !username || !password || !role) {
    return res.status(400).json({ message: 'Full name, username, password, and role are required.' });
  }

  // Hierarchy Protection: General Managers cannot create Owner accounts
  if (role === 'Owner' && !creatorRoles.includes('Owner') && !creatorRoles.includes('Super Admin')) {
    return res.status(403).json({ message: 'Forbidden: Only Owners can create Owner accounts.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if username exists
    const checkUser = await client.query(
      'SELECT staff_id FROM staff WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );

    if (checkUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    // 2. Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // 3. Insert staff member
    const insertStaffQuery = `
      INSERT INTO staff (full_name, username, password_hash, phone, status, created_by)
      VALUES ($1, $2, $3, $4, 'Active', $5)
      RETURNING staff_id, full_name, username, phone, status, created_at
    `;
    const staffResult = await client.query(insertStaffQuery, [
      full_name.trim(),
      username.trim(),
      password_hash,
      phone || null,
      creatorId || null
    ]);

    const newStaff = staffResult.rows[0];

    // 4. Assign role
    const insertRoleQuery = `
      INSERT INTO staff_roles (staff_id, role)
      VALUES ($1, $2)
    `;
    await client.query(insertRoleQuery, [newStaff.staff_id, role]);

    // 5. Create Audit Log Entry
    await client.query(`
      INSERT INTO audit_log (staff_id, action, entity_type, entity_id, details)
      VALUES ($1, 'CREATE_STAFF', 'staff', $2, $3::jsonb)
    `, [creatorId, newStaff.staff_id, JSON.stringify({ role, username: newStaff.username })]);

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Staff account created successfully.',
      staff: {
        ...newStaff,
        roles: [role],
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create Staff Error:', error);
    return res.status(500).json({ message: 'Internal server error while creating staff.' });
  } finally {
    client.release();
  }
};

// PUT /api/v1/staff/:id/status - Toggle staff Active/Inactive status
const toggleStaffStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const requesterRoles = req.user?.roles || [];

  if (!['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    // Check target staff user's roles
    const targetRolesRes = await pool.query('SELECT role FROM staff_roles WHERE staff_id = $1', [id]);
    const targetRoles = targetRolesRes.rows.map(r => r.role);

    // Prevent Managers from modifying Owner accounts
    if (targetRoles.includes('Owner') && !requesterRoles.includes('Owner') && !requesterRoles.includes('Super Admin')) {
      return res.status(403).json({ message: 'Forbidden: Managers cannot alter Owner account status.' });
    }

    const query = `
      UPDATE staff 
      SET status = $1 
      WHERE staff_id = $2 
      RETURNING staff_id, full_name, status
    `;
    const { rows } = await pool.query(query, [status, id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    // Write to audit log
    await pool.query(`
      INSERT INTO audit_log (staff_id, action, entity_type, entity_id, details)
      VALUES ($1, 'TOGGLE_STAFF_STATUS', 'staff', $2, $3::jsonb)
    `, [req.user?.staff_id, id, JSON.stringify({ new_status: status })]);

    return res.status(200).json({
      message: `Staff status updated to ${status}.`,
      staff: rows[0],
    });
  } catch (error) {
    console.error('Toggle Status Error:', error);
    return res.status(500).json({ message: 'Failed to update staff status.' });
  }
};

// DELETE /api/v1/staff/:id - Delete staff account
const deleteStaff = async (req, res) => {
  const { id } = req.params;
  const requesterRoles = req.user?.roles || [];

  try {
    // Prevent Managers from deleting Owner accounts[cite: 2]
    const targetRolesRes = await pool.query('SELECT role FROM staff_roles WHERE staff_id = $1', [id]);
    const targetRoles = targetRolesRes.rows.map(r => r.role);

    if (targetRoles.includes('Owner') && !requesterRoles.includes('Owner') && !requesterRoles.includes('Super Admin')) {
      return res.status(403).json({ message: 'Forbidden: Managers cannot delete Owner accounts.' });
    }

    const result = await pool.query('DELETE FROM staff WHERE staff_id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    // Write to audit log[cite: 2]
    await pool.query(`
      INSERT INTO audit_log (staff_id, action, entity_type, entity_id)
      VALUES ($1, 'DELETE_STAFF', 'staff', $2)
    `, [req.user?.staff_id, id]);

    return res.status(200).json({ message: 'Staff account deleted permanently.' });
  } catch (error) {
    console.error('Delete Staff Error:', error);
    if (error.code === '23503') {
      return res.status(400).json({
        message: 'Cannot delete staff account because this user has recorded activity/orders in sales history. Deactivate their status to "Inactive" instead.'
      });
    }
    return res.status(500).json({ message: 'Failed to delete staff account.' });
  }
};

module.exports = {
  getAllStaff,
  createStaff,
  toggleStaffStatus,
  deleteStaff,
  updateStaffStatus,
};