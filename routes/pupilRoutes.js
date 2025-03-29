// routes/pupilRoutes.js
const express = require('express');
const router = express.Router();
const pupilController = require('../controllers/pupilController');
const { requireFullAccess } = require('../middlewares/auth');

// Show main Pupils page
router.get('/', requireFullAccess, pupilController.showPupilPage);

// Return Pupils as JSON with optional filter
router.get('/all/json', requireFullAccess, pupilController.getAllPupils);

// Get single pupil by ID (for editing)
router.get('/:id/json', requireFullAccess, pupilController.getSinglePupil);

// Get transactions for a pupil
router.get('/:id/transactions', requireFullAccess, pupilController.getPupilTransactions);

// Show the "Add Pupil" page
//router.get('/add', pupilController.showAddPupilForm);

// Return all active forms as JSON
router.get('/getForms', requireFullAccess, pupilController.getAllForms);

// Handle "Add Pupil"
router.post('/add', requireFullAccess, pupilController.addPupil);

// Show the "Edit Pupil" page (unused if using modal)
router.get('/edit/:id', requireFullAccess, pupilController.showEditPupilForm);

// Handle "Edit Pupil"
router.post('/edit/:id', requireFullAccess, pupilController.editPupil);

// Handle "Add Form"
router.post('/addForm', requireFullAccess, pupilController.addForm);

// Handle "Delete Pupil" (set active=false)
router.get('/delete/:id', requireFullAccess, pupilController.deletePupil);

module.exports = router;

