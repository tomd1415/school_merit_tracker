// routes/csvRoutes.js
const express = require('express');
const router = express.Router();
const csvController = require('../controllers/csvController');
const { requireFullAccess } = require('../middlewares/auth');

// Multer setup for file uploads
const multer = require('multer');
const path = require('path');

// We'll store the uploaded CSV in a temp folder
const upload = multer({ dest: path.join(__dirname, '..', 'temp') });

// Show the Upload CSV page
router.get('/pupils', requireFullAccess, csvController.showUploadPupilCSVPage);

// Handle CSV file upload
router.post('/pupils', requireFullAccess, upload.single('csvFile'), csvController.uploadPupilCSV);

// Add a new route for "upload merits CSV"
router.post('/merits', requireFullAccess, upload.single('csvFile'), csvController.uploadMeritsCSV);


module.exports = router;

