const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// GET /api/v1/staff - Fetch all employees and their roles
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
        ARRAY_AGG(r.role) AS roles
      FROM staff s
      LEFT JOIN staff_roles r ON s.staff_id = r.staff_id
      GROUP BY s.staff_id
      ORDER BY s.created_at DESC
    `;
    const { rows } = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get Staff Error:', error);
    return res.status(500).json({ message: 'Failed to retrieve staff records.' });
  }
};

// POST /api/v1/staff - Create new staff account
const createStaff = async (req, res) => {
  const { full_name, username, password, phone, role } = req.body;

  if (!full_name || !username || !password || !role) {
    return res.status(400).json({ message: 'Full name, username, password, and role are required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if username already exists
    const checkUser = await client.query(
      'SELECT staff_id FROM staff WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );

    if (checkUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    // 2. Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 3. Insert staff member
    const insertStaffQuery = `
      INSERT INTO staff (full_name, username, password_hash, phone, status)
      VALUES ($1, $2, $3, $4, 'Active')
      RETURNING staff_id, full_name, username, phone, status, created_at
    `;
    const staffResult = await client.query(insertStaffQuery, [
      full_name.trim(),
      username.trim(),
      password_hash,
      phone || null,
    ]);

    const newStaff = staffResult.rows[0];

    // 4. Assign role
    const insertRoleQuery = `
      INSERT INTO staff_roles (staff_id, role)
      VALUES ($1, $2)
    `;
    await client.query(insertRoleQuery, [newStaff.staff_id, role]);

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
  const { status } = req.body; // Expects 'Active' or 'Inactive'

  if (!['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
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

    return res.status(200).json({
      message: `Staff status updated to ${status}.`,
      staff: rows[0],
    });
  } catch (error) {
    console.error('Toggle Status Error:', error);
    return res.status(500).json({ message: 'Failed to update staff status.' });
  }
};
// DELETE /api/v1/staff/:id - Safely delete or block deletion if tied to shift records
const deleteStaff = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM staff WHERE staff_id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    return res.status(200).json({ message: 'Staff account deleted permanently.' });
  } catch (error) {
    console.error('Delete Staff Error:', error);

    // Foreign Key constraint handling (PostgreSQL Error 23503)
    if (error.code === '23503') {
      return res.status(400).json({
        message: 'Cannot delete staff account because this user has recorded activity/orders in sales history. Deactivate their status to "Inactive" instead.'
      });
    }

    return res.status(500).json({ message: 'Failed to delete staff account.' });
  }
};

// Add deleteStaff to module.exports at the bottom of staffController.js
module.exports = {
  getAllStaff,
  createStaff,
  toggleStaffStatus,
  deleteStaff,
};
