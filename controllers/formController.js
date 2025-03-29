const path = require('path');
const pool = require('../db');

// Render Pupils page
exports.showFormPage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'forms', 'forms.html'));
};

// Get all forms
exports.getAllForms = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT form_id, form_name, form_tutor, year_group
      FROM form
      WHERE active = TRUE
      ORDER BY year_group, form_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching forms:', err);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
};

// Get a single form by ID
exports.getForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const result = await pool.query(`
      SELECT form_id, form_name, form_tutor, year_group
      FROM form
      WHERE form_id = $1 AND active = TRUE
    `, [formId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching form:', err);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
};

// Create a new form
exports.createForm = async (req, res) => {
  try {
    const { form_name, form_tutor, year_group } = req.body;

    // Validate input
    if (!form_name || !form_tutor || !year_group) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if form name already exists
    const existingForm = await pool.query(`
      SELECT form_id FROM form WHERE form_name = $1 AND active = TRUE
    `, [form_name]);

    if (existingForm.rowCount > 0) {
      return res.status(400).json({ error: 'Form name already exists' });
    }

    // Insert new form
    const result = await pool.query(`
      INSERT INTO form (form_name, form_tutor, year_group, active)
      VALUES ($1, $2, $3, TRUE)
      RETURNING form_id, form_name, form_tutor, year_group
    `, [form_name, form_tutor, year_group]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating form:', err);
    res.status(500).json({ error: 'Failed to create form' });
  }
};

// Update a form
exports.updateForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const { form_name, form_tutor, year_group } = req.body;

    console.log('Received update request:', {
      formId,
      form_name,
      form_tutor,
      year_group
    });

    // Validate input
    if (!form_name || !form_tutor || year_group === undefined || year_group === null) {
      console.log('Missing fields:', {
        hasFormName: !!form_name,
        hasFormTutor: !!form_tutor,
        hasYearGroup: year_group !== undefined && year_group !== null
      });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if form exists
    const formCheck = await pool.query(`
      SELECT form_id FROM form WHERE form_id = $1 AND active = TRUE
    `, [formId]);

    if (formCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Check if new form name already exists (excluding current form)
    const existingForm = await pool.query(`
      SELECT form_id FROM form WHERE form_name = $1 AND form_id != $2 AND active = TRUE
    `, [form_name, formId]);

    if (existingForm.rowCount > 0) {
      return res.status(400).json({ error: 'Form name already exists' });
    }

    // Update form
    const result = await pool.query(`
      UPDATE form
      SET form_name = $1, form_tutor = $2, year_group = $3
      WHERE form_id = $4 AND active = TRUE
      RETURNING form_id, form_name, form_tutor, year_group
    `, [form_name, form_tutor, year_group, formId]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating form:', err);
    res.status(500).json({ error: 'Failed to update form' });
  }
};

// Delete a form (soft delete - set active = false)
exports.deleteForm = async (req, res) => {
  try {
    const { formId } = req.params;

    // Check if form exists and has no pupils
    const formCheck = await pool.query(`
      SELECT f.form_id, COUNT(p.pupil_id) as pupil_count
      FROM form f
      LEFT JOIN pupils p ON f.form_id = p.form_id AND p.active = TRUE
      WHERE f.form_id = $1 AND f.active = TRUE
      GROUP BY f.form_id
    `, [formId]);

    if (formCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (formCheck.rows[0].pupil_count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete form with pupils. Please reassign or remove pupils first.' 
      });
    }

    // Soft delete form (set active = false)
    await pool.query(`
      UPDATE form 
      SET active = FALSE 
      WHERE form_id = $1
    `, [formId]);

    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (err) {
    console.error('Error deleting form:', err);
    res.status(500).json({ error: 'Failed to delete form' });
  }
}; 