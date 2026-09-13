const { pool } = require('../config/db');

// POST /api/v1/shifts/open - Open a new cashier shift
const openShift = async (req, res) => {
  const cashierId = req.user.staff_id || req.user.user_id;
  const { opening_cash } = req.body;

  try {
    const activeShift = await pool.query(
      `SELECT shift_id FROM cashier_shifts WHERE cashier_id = $1 AND status = 'Open';`,
      [cashierId]
    );

    if (activeShift.rows.length > 0) {
      return res.status(400).json({ message: 'You already have an active open shift.' });
    }

    const startCash = parseFloat(opening_cash) || 0.00;

    const insertQuery = `
      INSERT INTO cashier_shifts (cashier_id, status, opening_cash, expected_cash)
      VALUES ($1, 'Open', $2, $2)
      RETURNING *;
    `;

    const { rows } = await pool.query(insertQuery, [cashierId, startCash]);
    return res.status(201).json({ success: true, message: 'Shift opened successfully.', data: rows[0] });
  } catch (error) {
    console.error('Open Shift Error:', error);
    return res.status(500).json({ message: 'Failed to open shift.' });
  }
};

// POST /api/v1/shifts/close - Close active cashier shift
const closeShift = async (req, res) => {
  const cashierId = req.user.staff_id || req.user.user_id;
  const { actual_cash } = req.body;

  try {
    const shiftRes = await pool.query(
      `SELECT * FROM cashier_shifts WHERE cashier_id = $1 AND status = 'Open';`,
      [cashierId]
    );

    if (shiftRes.rows.length === 0) {
      return res.status(404).json({ message: 'No open shift found for this cashier.' });
    }

    const shift = shiftRes.rows[0];
    const actual = parseFloat(actual_cash) || 0.00;
    const expected = parseFloat(shift.expected_cash || 0.00);
    const difference = actual - expected;

    const closeQuery = `
      UPDATE cashier_shifts
      SET status = 'Closed',
          closing_time = CURRENT_TIMESTAMP,
          actual_cash = $1,
          cash_difference = $2
      WHERE shift_id = $3
      RETURNING *;
    `;

    const { rows } = await pool.query(closeQuery, [actual, difference, shift.shift_id]);
    return res.status(200).json({ success: true, message: 'Shift closed successfully.', data: rows[0] });
  } catch (error) {
    console.error('Close Shift Error:', error);
    return res.status(500).json({ message: 'Failed to close shift.' });
  }
};

// GET /api/v1/shifts/current - Get current shift status for logged-in cashier
const getCurrentShift = async (req, res) => {
  const cashierId = req.user.staff_id || req.user.user_id;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM cashier_shifts WHERE cashier_id = $1 AND status = 'Open' LIMIT 1;`,
      [cashierId]
    );

    if (rows.length === 0) {
      return res.status(200).json({ success: true, active: false, data: null });
    }

    return res.status(200).json({ success: true, active: true, data: rows[0] });
  } catch (error) {
    console.error('Get Current Shift Error:', error);
    return res.status(500).json({ message: 'Failed to retrieve current shift.' });
  }
};

// GET /api/v1/shifts/active-all - All active open register shifts (Manager / Owner)
const getActiveShifts = async (req, res) => {
  try {
    const query = `
      SELECT 
        cs.*,
        s.full_name AS cashier_name
      FROM cashier_shifts cs
      JOIN staff s ON cs.cashier_id = s.staff_id
      WHERE cs.status = 'Open'
      ORDER BY cs.opening_time DESC;
    `;
    const { rows } = await pool.query(query);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get Active Shifts Error:', error);
    return res.status(500).json({ message: 'Failed to fetch active shifts.' });
  }
};

// GET /api/v1/shifts/history - Closed shift historical logs (Manager / Owner)
const getAllShifts = async (req, res) => {
  try {
    const query = `
      SELECT 
        cs.*,
        s.full_name AS cashier_name
      FROM cashier_shifts cs
      JOIN staff s ON cs.cashier_id = s.staff_id
      WHERE cs.status = 'Closed'
      ORDER BY cs.closing_time DESC;
    `;
    const { rows } = await pool.query(query);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get All Shifts Error:', error);
    return res.status(500).json({ message: 'Failed to fetch shift history.' });
  }
};

// POST /api/v1/shifts/force-close/:shiftId - Emergency override close shift (Manager / Owner)
const forceCloseShift = async (req, res) => {
  const { shiftId } = req.params;

  try {
    const closeQuery = `
      UPDATE cashier_shifts
      SET status = 'Closed',
          closing_time = CURRENT_TIMESTAMP,
          actual_cash = expected_cash,
          cash_difference = 0.00
      WHERE shift_id = $1 AND status = 'Open'
      RETURNING *;
    `;

    const { rows } = await pool.query(closeQuery, [shiftId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Active shift not found or already closed.' });
    }

    return res.status(200).json({ success: true, message: 'Shift force closed by management.', data: rows[0] });
  } catch (error) {
    console.error('Force Close Shift Error:', error);
    return res.status(500).json({ message: 'Failed to force close shift.' });
  }
};

module.exports = {
  openShift,
  closeShift,
  getCurrentShift,
  getActiveShifts,
  getAllShifts,
  forceCloseShift,
};