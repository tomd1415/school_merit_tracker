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
    const query = `
      SELECT 
        p.pupil_id, 
        p.first_name, 
        p.last_name, 
        p.merits,
        p.active,
        f.form_name,
        f.form_tutor,
        f.year_group
      FROM pupils p
      JOIN form f 
        ON p.form_id = f.form_id
      ORDER BY p.pupil_id
    `;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (err) {
    console.error('Error fetching pupils:', err);
    res.status(500).json({ error: 'Failed to fetch pupils' });
  }
};


// 1) Show the "Add Pupil" page (HTML)
exports.showAddPupilForm = (req, res) => {
  // Serve the static HTML file from public/addPupil/addPupil.html
  res.sendFile(path.join(__dirname, '..', 'public', 'addPupil', 'addPupil.html'));
};

// Handle "Add Pupil" form submission
exports.addPupil = async (req, res) => {
  try {
    // We expect first_name, last_name, form_id from the form submission
    const { first_name, last_name, form_id } = req.body;

    // Insert into pupils with merits=0, active=true
    // (assuming the "merits" column does NOT have a default in your SQL, or you want to explicitly set it)
    const insertQuery = `
      INSERT INTO pupils (first_name, last_name, merits, form_id, active)
      VALUES ($1, $2, 0, $3, TRUE);
    `;
    await pool.query(insertQuery, [first_name, last_name, form_id]);

    // After adding the pupil, redirect to your pupil list or somewhere else
    res.redirect('/pupils');
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

// 2) Return all active Forms as JSON
//    We fetch more columns than just form_id / form_name in case we need them.
//    But you can decide how many columns you want to expose to the front-end.
exports.getAllForms = async (req, res) => {
  try {
    // Only list forms that are active
    const query = `
      SELECT form_id, form_name, form_tutor, year_group
      FROM form
      WHERE active = TRUE
      ORDER BY form_name;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching forms:', err);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
};

// 4) Handle "Add Form" submission
exports.addForm = async (req, res) => {
  try {
    // Expect form_name, form_tutor, year_group in the request
    const { form_name, form_tutor, year_group } = req.body;

    const insertFormQuery = `
      INSERT INTO form (form_name, form_tutor, year_group, active)
      VALUES ($1, $2, $3, TRUE);
    `;
    await pool.query(insertFormQuery, [form_name, form_tutor, year_group]);

    // If this is an AJAX request, respond with JSON
    res.json({ message: 'Form created successfully' });
  } catch (err) {
    console.error('Error adding form:', err);
    res.status(500).json({ error: 'Failed to add form' });
  }
};
