const express = require('express');
const router = express.Router();
const { requestDiscount, getPendingDiscounts, reviewDiscountRequest } = require('../controllers/discountController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Waiter submits request
router.post('/request', authenticateToken, requireRole(['Waiter', 'Manager', 'Owner']), requestDiscount);

// Manager / GM / Owner reviews
router.get('/pending', authenticateToken, requireRole(['Manager', 'General Manager', 'Owner']), getPendingDiscounts);
router.put('/:id/review', authenticateToken, requireRole(['Manager', 'General Manager', 'Owner']), reviewDiscountRequest);

module.exports = router;