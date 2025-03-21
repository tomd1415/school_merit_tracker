// routes/purchaseRoutes.js
const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { requirePurchaseAccess } = require('../middlewares/auth');

// 1) Show the main "Purchase" page
router.get('/', requirePurchaseAccess, purchaseController.showPurchasePage);

// 2) Return all active prizes (for listing)
router.get('/allPrizes', requirePurchaseAccess, purchaseController.getAllPrizes);

// 3) Search Pupils by partial name
router.get('/searchPupil', requirePurchaseAccess, purchaseController.searchPupil);

// 4) Create a Purchase
router.post('/create', requirePurchaseAccess, purchaseController.createPurchase);

// 5) Cancel (DELETE) a Purchase by ID
router.delete('/cancel/:purchaseId', requirePurchaseAccess, purchaseController.cancelPurchase);

module.exports = router;

