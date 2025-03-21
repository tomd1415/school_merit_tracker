// routes/prizeRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const prizeController = require('../controllers/prizeController');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save files to public/uploads
    cb(null, path.join(__dirname, '..', 'public', 'images'));
  },
  filename: function (req, file, cb) {
    // Create a unique file name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Show main Prizes page (HTML)
router.get('/', prizeController.showPrizesPage);

// Return all Prizes as JSON
router.get('/all/json', prizeController.getAllPrizes);

// Show "Add Prize" page (HTML)
router.get('/add', prizeController.showAddPrizeForm);

// Handle "Add Prize" form submission with image upload
router.post('/add', upload.single('image'), prizeController.addPrize);

// Show "Edit Prize" page (HTML)
router.get('/edit/:id', prizeController.showEditPrizeForm);

// Return single prize as JSON for the edit form
router.get('/:id/json', prizeController.getPrizeById);

// Handle "Edit Prize" form submission with optional image upload
router.post('/edit/:id', upload.single('image'), prizeController.editPrize);

// Handle "Delete Prize"
router.get('/delete/:id', prizeController.deletePrize);

module.exports = router;

