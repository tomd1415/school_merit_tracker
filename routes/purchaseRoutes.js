// routes/purchaseRoutes.js
const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');

// 1) Show the main "Purchase" page
router.get('/', purchaseController.showPurchasePage);

// 2) Return all active prizes (for listing)
router.get('/allPrizes', purchaseController.getAllPrizes);

// 3) Search Pupils by partial name
router.get('/searchPupil', purchaseController.searchPupil);

// 4) Create a Purchase
router.post('/create', purchaseController.createPurchase);

// 5) Cancel (DELETE) a Purchase by ID
router.delete('/cancel/:purchaseId', purchaseController.cancelPurchase);

module.exports = router;

