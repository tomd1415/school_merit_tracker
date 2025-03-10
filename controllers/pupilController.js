// controllers/pupilController.js
const path = require('path');
const pool = require('../db');

// Render the Pupils page (basic HTML listing)
exports.showPupilPage = (req, res) => {
  // Simply send the static HTML page for listing Pupils
  res.sendFile(
    path.join(__dirname, '..', 'public', 'pupils', 'pupils.html')
  );
};

// Return Pupils as JSON (for dynamic loading in pupils.js)
exports.getAllPupils = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pupils ORDER BY pupil_id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pupils:', err);
    res.status(500).json({ error: 'Failed to fetch pupils' });
  }
};

// Render the "Add Pupil" form
exports.showAddPupilForm = (req, res) => {
  res.sendFile(
    path.join(__dirname, '..', 'public', 'addPupil', 'addPupil.html')
  );
};

// Handle "Add Pupil" form submission
exports.addPupil = async (req, res) => {
  try {
    const { name, form_group } = req.body;
    // Optional: you could set initial merits to 0 or let the user specify
    const merits = 0;

    await pool.query(
      'INSERT INTO pupils (name, form_group, merits) VALUES ($1, $2, $3)',
      [name, form_group, merits]
    );

    res.redirect('/pupils'); // Go back to the main Pupils list
  } catch (err) {
    console.error('Error adding pupil:', err);
    res.status(500).send('Failed to add pupil');
  }
};

// GET edit form
exports.showEditPupilForm = async (req, res) => {
  // In a real system, you might serve a separate HTML page or the same page with some logic
  // For now, just for demonstration
  res.send('Edit form page not yet implemented.');
};

// POST edit form
exports.editPupil = async (req, res) => {
  // Implementation goes here
  res.send('Edit pupil not yet implemented.');
};

// DELETE pupil
exports.deletePupil = async (req, res) => {
  // Implementation goes here
  res.send('Delete pupil not yet implemented.');
};

