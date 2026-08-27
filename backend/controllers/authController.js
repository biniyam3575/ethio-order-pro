const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// POST /api/v1/auth/login
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // 1. Fetch staff member by username
    // In backend/controllers/authController.js
    const staffQuery = `
      SELECT s.staff_id, s.full_name, TRIM(s.username) AS username, s.password_hash, s.status
      FROM staff s
      WHERE LOWER(s.username) = LOWER($1)
    `;
    const { rows } = await pool.query(staffQuery, [username]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const user = rows[0];

    // Check account status
    if (user.status === 'Inactive') {
      return res.status(403).json({ message: 'Account is deactivated. Contact Manager.' });
    }

    // 2. Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // 3. Fetch user roles
    const roleQuery = `SELECT role FROM staff_roles WHERE staff_id = $1`;
    const roleResult = await pool.query(roleQuery, [user.staff_id]);
    const roles = roleResult.rows.map((r) => r.role);

    // 4. Generate JWT token
    const payload = {
      staff_id: user.staff_id,
      username: user.username,
      full_name: user.full_name,
      roles: roles,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: payload,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { login };