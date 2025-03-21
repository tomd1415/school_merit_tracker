// routes/pinRoutes.js
const express = require('express');
const router = express.Router();
const pinController = require('../controllers/pinController');

// GET: Show the PIN entry page
router.get('/enter-pin', pinController.showPinPage);

// POST: Check the PIN submission
router.post('/check-pin', pinController.checkPin);

// Optional: Log out
router.get('/logout', pinController.logout);

module.exports = router;

