// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireFullAccess } = require('../middlewares/auth');

router.get('/', requireFullAccess, orderController.showOrdersPage);
router.get('/filters', requireFullAccess, orderController.getFilters);
router.get('/list', requireFullAccess, orderController.listOrders);
router.patch('/:purchaseId/collect', requireFullAccess, orderController.markCollected);
router.patch('/:purchaseId/refund', requireFullAccess, orderController.markRefunded);

module.exports = router;
