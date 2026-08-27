const { pool } = require('../config/db');

// GET /api/v1/tables - Fetch all tables
const getAllTables = async (req, res) => {
  try {
    const query = `
      SELECT table_id, table_number, capacity, section, status, created_at
      FROM tables
      ORDER BY section ASC, table_number ASC
    `;
    const { rows } = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get Tables Error:', error);
    return res.status(500).json({ message: 'Failed to retrieve tables.' });
  }
};

// POST /api/v1/tables - Add a new table
const createTable = async (req, res) => {
  const { table_number, capacity, section } = req.body;

  if (!table_number || !capacity) {
    return res.status(400).json({ message: 'Table number and capacity are required.' });
  }

  try {
    const query = `
      INSERT INTO tables (table_number, capacity, section, status)
      VALUES ($1, $2, $3, 'Available')
      RETURNING table_id, table_number, capacity, section, status
    `;
    const { rows } = await pool.query(query, [
      parseInt(table_number),
      parseInt(capacity),
      section ? section.trim() : 'Main Hall',
    ]);

    return res.status(201).json({
      message: 'Table created successfully.',
      table: rows[0],
    });
  } catch (error) {
    console.error('Create Table Error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Table number already exists.' });
    }
    return res.status(500).json({ message: 'Failed to create table.' });
  }
};

// DELETE /api/v1/tables/:id - Delete table
const deleteTable = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM tables WHERE table_id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Table not found.' });
    }

    return res.status(200).json({ message: 'Table removed from floor plan.' });
  } catch (error) {
    console.error('Delete Table Error:', error);
    if (error.code === '23503') {
      return res.status(400).json({
        message: 'Cannot delete table with active or past orders assigned to it.',
      });
    }
    return res.status(500).json({ message: 'Failed to delete table.' });
  }
};

module.exports = {
  getAllTables,
  createTable,
  deleteTable,
};