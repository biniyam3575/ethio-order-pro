const express = require('express');
const router = express.Router();
const { getPendingDiscounts, reviewDiscountRequest } = require('../controllers/discountController');
const { authenticateToken, requireManager } = require('../middleware/auth');

router.use(authenticateToken, requireManager);

router.get('/pending', getPendingDiscounts);
router.put('/:id/review', reviewDiscountRequest);

module.exports = router;