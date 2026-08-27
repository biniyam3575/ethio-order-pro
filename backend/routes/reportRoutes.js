const express = require('express');
const router = express.Router();
const { getSalesSummary } = require('../controllers/reportController');

router.get('/summary', getSalesSummary);

module.exports = router;