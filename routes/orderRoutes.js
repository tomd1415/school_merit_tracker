// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requirePurchaseAccess } = require('../middlewares/auth');

router.get('/', requirePurchaseAccess, orderController.showOrdersPage);
router.get('/filters', requirePurchaseAccess, orderController.getFilters);
router.get('/list', requirePurchaseAccess, orderController.listOrders);
router.patch('/:purchaseId/collect', requirePurchaseAccess, orderController.markCollected);
router.patch('/:purchaseId/refund', requirePurchaseAccess, orderController.markRefunded);

module.exports = router;
