const express = require('express');
const router = express.Router();
const {
  getAllTables,
  createTable,
  deleteTable,
} = require('../controllers/tableController');
const { authenticateToken, requireManager } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getAllTables);
router.post('/', requireManager, createTable);
router.delete('/:id', requireManager, deleteTable);

module.exports = router;