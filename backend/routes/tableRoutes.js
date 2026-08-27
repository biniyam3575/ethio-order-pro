const express = require('express');
const router = express.Router();
const {
  getAllTables,
  createTable,
  deleteTable,
} = require('../controllers/tableController');

router.get('/', getAllTables);
router.post('/', createTable);
router.delete('/:id', deleteTable);

module.exports = router;