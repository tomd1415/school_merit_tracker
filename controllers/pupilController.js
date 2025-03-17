// controllers/pupilController.js
const path = require('path');
const pool = require('../db');

// Render Pupils page
exports.showPupilPage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pupils', 'pupils.html'));
};

// controllers/pupilController.js
exports.getAllPupils = async (req, res) => {
  try {
    const { form_id } = req.query;

    // Updated query: left-join the "pupils_remaining_merits" view
    // (assuming it has a column "pupil_id" and "remaining_merits").
    let query = `
      SELECT 
        p.pupil_id,
        p.first_name,
        p.last_name,
        p.merits,
        p.active,
        p.form_id,
        f.form_name,
        pr.remaining_merits
      FROM pupils p
      JOIN form f 
        ON p.form_id = f.form_id
      LEFT JOIN pupil_remaining_merits pr
        ON p.pupil_id = pr.pupil_id
      WHERE p.active = TRUE
    `;

    const params = [];
    // If form_id is provided for filtering
    if (form_id) {
      params.push(form_id);
      query += ` AND p.form_id = $${params.length}`;
    }

    // Sort by last name, first name
    query += ' ORDER BY p.last_name ASC, p.first_name ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pupils:', err);
    res.status(500).json({ error: 'Failed to fetch pupils' });
  }
};

// Add Pupil
exports.addPupil = async (req, res) => {
  try {
    const { first_name, last_name, form_id } = req.body;

    // Basic validation
    if (!first_name || !last_name || !form_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const insertQuery = `
      INSERT INTO pupils (first_name, last_name, merits, form_id, active)
      VALUES ($1, $2, 0, $3, TRUE)
    `;
    await pool.query(insertQuery, [first_name, last_name, form_id]);

    res.redirect('/pupils');
  } catch (err) {
    console.error('Error adding pupil:', err);
    res.status(500).send('Failed to add pupil');
  }
};

// Show Edit Pupil (not a separate page in the final approach, but left as is)
exports.showEditPupilForm = async (req, res) => {
  res.send('Edit form page not yet implemented. (We will use a modal instead.)');
};

// Fetch a single pupil by ID (for the modal)
exports.getSinglePupil = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        p.pupil_id, 
        p.first_name, 
        p.last_name, 
        p.merits,
        p.active,
        p.form_id,
        f.form_name,
        f.form_tutor,
        f.year_group
      FROM pupils p
      JOIN form f ON p.form_id = f.form_id
      WHERE p.pupil_id = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pupil not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching single pupil:', err);
    res.status(500).json({ error: 'Failed to fetch pupil' });
  }
};

// POST edit pupil
exports.editPupil = async (req, res) => {
  try {
    const { id } = req.params;
    let { first_name, last_name, form_id, merits } = req.body;

    // Validate input
    if (!first_name || !last_name || !form_id || merits == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    merits = parseInt(merits, 10);
    if (isNaN(merits) || merits < 0) {
      return res.status(400).json({ error: 'Merits must be a non-negative number' });
    }

    // Example: If you have a separate "merits_spent" field, add that here
    // We'll assume you want to store total merits in "merits" column
    const updateQuery = `
      UPDATE pupils
      SET first_name = $1,
          last_name  = $2,
          form_id    = $3,
          merits     = $4
      WHERE pupil_id = $5
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, [first_name, last_name, form_id, merits, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pupil not found or not updated' });
    }

    res.json({ message: 'Pupil updated successfully', pupil: result.rows[0] });
  } catch (err) {
    console.error('Error editing pupil:', err);
    res.status(500).json({ error: 'Failed to edit pupil' });
  }
};

// "Delete" pupil - set active to false
exports.deletePupil = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE pupils
      SET active = FALSE
      WHERE pupil_id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pupil not found' });
    }

    // If this is an AJAX request, you can respond with JSON
    // If it’s a simple link or redirect, you can do a redirect instead:
    res.json({ message: 'Pupil deleted (set to inactive)' });
  } catch (err) {
    console.error('Error deleting pupil:', err);
    res.status(500).json({ error: 'Failed to delete pupil' });
  }
};

// Return all active Forms as JSON
exports.getAllForms = async (req, res) => {
  try {
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

// Add Form
exports.addForm = async (req, res) => {
  try {
    const { form_name, form_tutor, year_group } = req.body;
    const insertFormQuery = `
      INSERT INTO form (form_name, form_tutor, year_group, active)
      VALUES ($1, $2, $3, TRUE);
    `;
    await pool.query(insertFormQuery, [form_name, form_tutor, year_group]);
    res.json({ message: 'Form created successfully' });
  } catch (err) {
    console.error('Error adding form:', err);
    res.status(500).json({ error: 'Failed to add form' });
  }
};

