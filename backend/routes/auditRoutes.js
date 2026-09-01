const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { authenticateToken, requireOwner } = require('../middleware/auth');

router.use(authenticateToken, requireOwner);
router.get('/', getAuditLogs);

module.exports = router;