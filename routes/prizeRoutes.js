// routes/prizeRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const prizeController = require('../controllers/prizeController');
const { requireFullAccess } = require('../middlewares/auth');

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
router.get('/', requireFullAccess, prizeController.showPrizesPage);

// Return all Prizes as JSON
router.get('/all/json', requireFullAccess, prizeController.getAllPrizes);

// Show "Add Prize" page (HTML)
router.get('/add', requireFullAccess, prizeController.showAddPrizeForm);

// Handle "Add Prize" form submission with image upload
router.post('/add', requireFullAccess, upload.single('image'), prizeController.addPrize);

// Show "Edit Prize" page (HTML)
router.get('/edit/:id', requireFullAccess, prizeController.showEditPrizeForm);

// Return single prize as JSON for the edit form
router.get('/:id/json', requireFullAccess, prizeController.getPrizeById);

// Handle "Edit Prize" form submission with optional image upload
router.post('/edit/:id', requireFullAccess, upload.single('image'), prizeController.editPrize);

// Handle "Delete Prize"
router.get('/delete/:id', requireFullAccess, prizeController.deletePrize);

module.exports = router;

