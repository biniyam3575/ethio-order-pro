const express = require('express');
const router = express.Router();
const { getAllStaff, createStaff, toggleStaffStatus, deleteStaff } = require('../controllers/staffController');
const { authenticateToken, requireManager } = require('../middleware/auth');

router.use(authenticateToken, requireManager);

router.get('/', getAllStaff);
router.post('/', createStaff);
router.put('/:id/status', toggleStaffStatus);
router.delete('/:id', deleteStaff);

module.exports = router;