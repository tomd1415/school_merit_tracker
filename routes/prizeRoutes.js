// routes/prizeRoutes.js
const express = require('express');
const router = express.Router();
const prizeController = require('../controllers/prizeController');

// Show main Prizes page (HTML)
router.get('/', prizeController.showPrizesPage);

// Return all Prizes as JSON
router.get('/all/json', prizeController.getAllPrizes);

// Show "Add Prize" page (HTML)
router.get('/add', prizeController.showAddPrizeForm);

// Handle "Add Prize" form submission
router.post('/add', prizeController.addPrize);

// Show "Edit Prize" page (HTML)
router.get('/edit/:id', prizeController.showEditPrizeForm);

// Return single prize as JSON for the edit form
router.get('/:id/json', prizeController.getPrizeById);

// Handle "Edit Prize" form submission
router.post('/edit/:id', prizeController.editPrize);

// Handle "Delete Prize"
router.get('/delete/:id', prizeController.deletePrize);

module.exports = router;

