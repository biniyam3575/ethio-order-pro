const express = require('express');
const router = express.Router();
const { getAllStaff, createStaff, toggleStaffStatus , deleteStaff} = require('../controllers/staffController');

router.get('/', getAllStaff);
router.post('/', createStaff);
router.put('/:id/status', toggleStaffStatus);
router.delete('/:id', deleteStaff);

module.exports = router;