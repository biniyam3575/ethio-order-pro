const express = require('express');
const router = express.Router();
const {
  getAllMenuItems,
  createMenuItem,
  toggleItemAvailability, deleteMenuItem,
} = require('../controllers/menuController');

router.get('/', getAllMenuItems);
router.post('/', createMenuItem);
router.put('/:id/availability', toggleItemAvailability);
router.delete('/:id', deleteMenuItem);

module.exports = router;