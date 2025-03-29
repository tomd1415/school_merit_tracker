const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const { requireFullAccess } = require('../middlewares/auth');

// Apply authentication middleware to all routes
// Get all forms
router.get('/all', requireFullAccess, formController.getAllForms);

// Get a single form
router.get('/:formId', requireFullAccess, formController.getForm);

// Create a new form
router.post('/create', requireFullAccess, formController.createForm);

// Update a form
router.put('/update/:formId', requireFullAccess, formController.updateForm);

// Delete a form
router.delete('/delete/:formId', requireFullAccess, formController.deleteForm);

module.exports = router; 