const express = require('express');
const router = express.Router();
const {
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleItemAvailability,
  deleteMenuItem,
} = require('../controllers/menuController');
const { authenticateToken, requireManager, authorizeRoles } = require('../middleware/auth'); // ensure authorizeRoles exists or write explicit inline check

router.use(authenticateToken);

// Publicly accessible to all logged in staff users (Waiters, Kitchen, Bar, Hot Drinks, Cashier, Manager, Owner)
router.get('/', getAllMenuItems);

// Allowed for Kitchen, Bar, Hot Drinks, Manager, and Owner staff
router.put('/:id/availability', (req, res, next) => {
  const userRoles = req.user.roles || [req.user.role];
  const allowedStationRoles = ['Kitchen', 'Bar', 'Hot Drinks', 'Manager', 'General Manager', 'Owner'];
  
  const hasAccess = userRoles.some(role => allowedStationRoles.includes(role));
  if (!hasAccess) {
    return res.status(403).json({ message: 'Forbidden: Station access rights required.' });
  }
  next();
}, toggleItemAvailability);

// Manager / Owner Only Administrative Endpoints
router.post('/', requireManager, createMenuItem);
router.put('/:id', requireManager, updateMenuItem);
router.delete('/:id', requireManager, deleteMenuItem);

module.exports = router;