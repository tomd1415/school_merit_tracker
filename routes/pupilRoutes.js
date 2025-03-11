// routes/pupilRoutes.js
const express = require('express');
const router = express.Router();
const pupilController = require('../controllers/pupilController');

// 1) Show main Pupils page (HTML)
router.get('/', pupilController.showPupilPage);

// 2) Return all Pupils as JSON (used by pupils.js)
router.get('/all/json', pupilController.getAllPupils);

// 3) Show the "Add Pupil" page (HTML)
router.get('/add', pupilController.showAddPupilForm);

// Return all active forms as JSON
router.get('/getForms', pupilController.getAllForms);

// 4) Handle "Add Pupil" form submission
router.post('/add', pupilController.addPupil);

// 5) Show the "Edit Pupil" page
router.get('/edit/:id', pupilController.showEditPupilForm);

// 6) Handle "Edit Pupil" form submission
router.post('/edit/:id', pupilController.editPupil);

// Handle "Add Form" submission
router.post('/addForm', pupilController.addForm);

// 7) Handle "Delete Pupil"
router.get('/delete/:id', pupilController.deletePupil);

module.exports = router;

