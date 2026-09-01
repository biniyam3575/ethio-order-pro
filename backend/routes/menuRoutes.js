const express = require('express');
const router = express.Router();
const {
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleItemAvailability,
  deleteMenuItem,
} = require('../controllers/menuController');
const { authenticateToken, requireManager } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getAllMenuItems);
router.post('/', requireManager, createMenuItem);
router.put('/:id', requireManager, updateMenuItem);
router.put('/:id/availability', requireManager, toggleItemAvailability);
router.delete('/:id', requireManager, deleteMenuItem);

module.exports = router;