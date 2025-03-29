const express = require('express');
const router = express.Router();
const pupilController = require('../controllers/pupilController');

// GET pupils management page
router.get('/', pupilController.showPupilPage);

// API: GET all pupils
router.get('/api/pupils', pupilController.getAllPupils);

// API: GET a single pupil by ID
router.get('/api/pupils/:id', pupilController.getSinglePupil);

// API: GET all transactions for a pupil
router.get('/api/pupils/:id/transactions', pupilController.getPupilTransactions);

// Render the transactions for a pupil (used by frontend)
router.get('/:id/transactions', pupilController.getPupilTransactions);

// API: POST create new pupil
router.post('/api/pupils', pupilController.addPupil);

// API: PUT update a pupil
router.put('/api/pupils/:id', pupilController.editPupil);

// API: DELETE a pupil (actually sets active=false)
router.delete('/api/pupils/:id', pupilController.deletePupil);

// API: GET all forms
router.get('/api/forms', pupilController.getAllForms);

// API: POST create new form
router.post('/api/forms', pupilController.addForm);

module.exports = router; 