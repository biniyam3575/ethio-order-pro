const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// Route: POST /api/v1/auth/login
router.post('/login', login);

module.exports = router;