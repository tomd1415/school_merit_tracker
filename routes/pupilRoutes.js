// routes/pupilRoutes.js
const express = require('express');
const router = express.Router();
const pupilController = require('../controllers/pupilController');

// Show main Pupils page
router.get('/', pupilController.showPupilPage);

// Return Pupils as JSON with optional filter
router.get('/all/json', pupilController.getAllPupils);

// Get single pupil by ID (for editing)
router.get('/:id/json', pupilController.getSinglePupil);

// Show the "Add Pupil" page
//router.get('/add', pupilController.showAddPupilForm);

// Return all active forms as JSON
router.get('/getForms', pupilController.getAllForms);

// Handle "Add Pupil"
router.post('/add', pupilController.addPupil);

// Show the "Edit Pupil" page (unused if using modal)
router.get('/edit/:id', pupilController.showEditPupilForm);

// Handle "Edit Pupil"
router.post('/edit/:id', pupilController.editPupil);

// Handle "Add Form"
router.post('/addForm', pupilController.addForm);

// Handle "Delete Pupil" (set active=false)
router.get('/delete/:id', pupilController.deletePupil);

module.exports = router;

