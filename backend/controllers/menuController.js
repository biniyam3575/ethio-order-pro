const { pool } = require('../config/db');

// GET /api/v1/menu - Fetch all menu items (Optionally filter by ?station=)
const getAllMenuItems = async (req, res) => {
  const { station } = req.query;

  try {
    let query = `
      SELECT item_id, name, category, price, description, is_available, station, display_order, created_at
      FROM menu_items
    `;
    const queryParams = [];

    // Optional filtering by station (e.g., Kitchen, Bar, Hot Drinks)
    if (station) {
      query += ` WHERE station = $1`;
      queryParams.push(station);
    }

    query += ` ORDER BY category ASC, display_order ASC, name ASC`;

    const { rows } = await pool.query(query, queryParams);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get Menu Error:', error);
    return res.status(500).json({ message: 'Failed to retrieve menu items.' });
  }
};

// POST /api/v1/menu - Create new item (Managers / Owners)
const createMenuItem = async (req, res) => {
  const { name, category, price, description, station } = req.body;

  if (!name || !category || price === undefined) {
    return res.status(400).json({ message: 'Name, category, and price are required.' });
  }

  try {
    const query = `
      INSERT INTO menu_items (name, category, price, description, station, is_available)
      VALUES ($1, $2, $3, $4, COALESCE($5, 'Kitchen'), true)
      RETURNING item_id, name, category, price, description, station, is_available
    `;
    const { rows } = await pool.query(query, [
      name.trim(),
      category.trim(),
      parseFloat(price),
      description ? description.trim() : null,
      station ? station.trim() : 'Kitchen'
    ]);

    return res.status(201).json({
      message: 'Menu item created successfully.',
      item: rows[0],
    });
  } catch (error) {
    console.error('Create Menu Item Error:', error);
    return res.status(500).json({ message: 'Failed to create menu item.' });
  }
};

// PUT /api/v1/menu/:id - Full edit on menu item (Managers / Owners)
const updateMenuItem = async (req, res) => {
  const { id } = req.params;
  const { name, category, price, description, station } = req.body;

  try {
    const query = `
      UPDATE menu_items
      SET name = COALESCE($1, name),
          category = COALESCE($2, category),
          price = COALESCE($3, price),
          description = COALESCE($4, description),
          station = COALESCE($5, station),
          updated_at = CURRENT_TIMESTAMP
      WHERE item_id = $6
      RETURNING *
    `;
    const { rows } = await pool.query(query, [name, category, price, description, station, id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }

    return res.status(200).json({ message: 'Menu item updated successfully.', item: rows[0] });
  } catch (error) {
    console.error('Update Menu Item Error:', error);
    return res.status(500).json({ message: 'Failed to update menu item.' });
  }
};

// PUT /api/v1/menu/:id/availability - Toggle availability (Station Workers & Managers)
const toggleItemAvailability = async (req, res) => {
  const { id } = req.params;
  
  // Accept both is_available (snake_case) or isAvailable (camelCase) from req.body
  const targetAvailability = req.body.is_available !== undefined 
    ? req.body.is_available 
    : req.body.isAvailable;

  if (targetAvailability === undefined) {
    return res.status(400).json({ message: 'Availability status value (is_available) is required.' });
  }

  try {
    const query = `
      UPDATE menu_items
      SET is_available = $1, updated_at = CURRENT_TIMESTAMP
      WHERE item_id = $2
      RETURNING item_id, name, is_available
    `;
    const { rows } = await pool.query(query, [targetAvailability, id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }

    return res.status(200).json({
      message: `Item availability updated to ${targetAvailability ? 'Available' : 'Out of Stock'}.`,
      item: rows[0],
    });
  } catch (error) {
    console.error('Toggle Availability Error:', error);
    return res.status(500).json({ message: 'Failed to update item availability.' });
  }
};

// DELETE /api/v1/menu/:id (Managers / Owners)
const deleteMenuItem = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM menu_items WHERE item_id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }

    return res.status(200).json({ message: 'Menu item deleted permanently.' });
  } catch (error) {
    console.error('Delete Menu Item Error:', error);
    if (error.code === '23503') {
      return res.status(400).json({
        message: 'Cannot delete item because it is linked to past sales history. Mark it "Out of Stock" instead.'
      });
    }
    return res.status(500).json({ message: 'Failed to delete menu item.' });
  }
};

module.exports = {
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleItemAvailability,
  deleteMenuItem,
};