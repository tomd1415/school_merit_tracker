// controllers/prizeController.js
const path = require('path');
const pool = require('../db'); // same db.js pool

/**
 * Show the main "Prizes" page (HTML).
 * This is similar to the Pupils page: it lists all existing prizes.
 */
exports.showPrizesPage = (req, res) => {
  // Send the static HTML file for listing prizes
  res.sendFile(path.join(__dirname, '..', 'public', 'prizes', 'prizes.html'));
};

/**
 * Return all active prizes as JSON.
 * We'll keep it simple, ignoring columns like total_stocked_ever for now,
 * or you can expand the columns if needed.
 */
exports.getAllPrizes = async (req, res) => {
  try {
    // Example: list all prizes, including any columns you want to display
    // If you only want active ones, add "WHERE active = true"
    const query = `
      SELECT
        prize_id,
        description,
        cost_merits,
        cost_money,
        image_path,
        active
      FROM prizes
      ORDER BY prize_id;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching prizes:', err);
    res.status(500).json({ error: 'Failed to fetch prizes' });
  }
};

/**
 * Show the "Add Prize" page (HTML).
 * This is similar to the Pupils version.
 */
exports.showAddPrizeForm = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'addPrize', 'addPrize.html'));
};

/**
 * Handle "Add Prize" form submission.
 * For now, set total_stocked_ever = 0 and stock_adjustment = 0, active = true.
 */
exports.addPrize = async (req, res) => {
  try {
    // Expect these from the form
    const { description, cost_merits, cost_money, image_path } = req.body;

    // Insert into the prizes table
    // We'll default total_stocked_ever=0, stock_adjustment=0, active=true
    const insertQuery = `
      INSERT INTO prizes 
        (description, cost_merits, cost_money, image_path, total_stocked_ever, stock_adjustment, active)
      VALUES 
        ($1, $2, $3, $4, 0, 0, true);
    `;
    await pool.query(insertQuery, [description, cost_merits, cost_money, image_path]);

    // Redirect to the main prizes list or wherever you like
    res.redirect('/prizes');
  } catch (err) {
    console.error('Error adding prize:', err);
    res.status(500).send('Failed to add prize');
  }
};

/**
 * Show the "Edit Prize" page (HTML).
 * Typically you’d have a separate HTML (e.g., editPrize.html) or reuse the same page.
 * For example’s sake, we’ll serve a new page that can fetch existing data via /prizes/:id/json.
 */
exports.showEditPrizeForm = (req, res) => {
  // For demonstration, serve a static HTML file
  res.sendFile(path.join(__dirname, '..', 'public', 'prizes', 'editPrize.html'));
};

/**
 * Return the details for a single prize as JSON,
 * used by an edit form to pre-populate fields.
 */
exports.getPrizeById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT
        prize_id,
        description,
        cost_merits,
        cost_money,
        image_path,
        active
      FROM prizes
      WHERE prize_id = $1
      LIMIT 1;
    `;
    const result = await pool.query(query, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prize not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching prize by ID:', err);
    res.status(500).json({ error: 'Failed to fetch prize' });
  }
};

/**
 * Handle "Edit Prize" form submission.
 * Update the record in the DB.
 */
exports.editPrize = async (req, res) => {
  const { id } = req.params;
  const { description, cost_merits, cost_money, image_path, active } = req.body;
  try {
    const updateQuery = `
      UPDATE prizes
      SET
        description = $1,
        cost_merits = $2,
        cost_money = $3,
        image_path = $4,
        active = $5
      WHERE prize_id = $6;
    `;
    await pool.query(updateQuery, [
      description,
      cost_merits,
      cost_money,
      image_path,
      active === 'true' || active === true, // handle checkbox or string
      id
    ]);

    res.redirect('/prizes');
  } catch (err) {
    console.error('Error editing prize:', err);
    res.status(500).send('Failed to edit prize');
  }
};

/**
 * Delete a prize.
 * This example does a real DELETE. 
 * If you prefer a "soft delete," do: UPDATE prizes SET active=false WHERE prize_id=$1.
 */
exports.deletePrize = async (req, res) => {
  const { id } = req.params;
  try {
    const deleteQuery = `DELETE FROM prizes WHERE prize_id = $1;`;
    await pool.query(deleteQuery, [id]);
    res.redirect('/prizes');
  } catch (err) {
    console.error('Error deleting prize:', err);
    res.status(500).send('Failed to delete prize');
  }
};

exports.addPrize = async (req, res) => {
  try {
    const { description, cost_merits, cost_money } = req.body;
    // Ensure a file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Image upload required' });
    }
    // Build the publically accessible path for the image
    const image_path = '/images/' + req.file.filename;

    const insertQuery = `
      INSERT INTO prizes 
        (description, cost_merits, cost_money, image_path, total_stocked_ever, stock_adjustment, active)
      VALUES 
        ($1, $2, $3, $4, 0, 0, true);
    `;
    await pool.query(insertQuery, [description, cost_merits, cost_money, image_path]);

    // For AJAX or JSON responses you might return JSON,
    // but here we redirect back to the prizes page.
    res.redirect('/prizes');
  } catch (err) {
    console.error('Error adding prize:', err);
    res.status(500).send('Failed to add prize');
  }
};

/**
 * Handle "Edit Prize" form submission.
 */
exports.editPrize = async (req, res) => {
  const { id } = req.params;
  let { description, cost_merits, cost_money, active } = req.body;
  // Set image_path to the original path unless a new image is uploaded
  let image_path = req.body.image_path || '';

  // If a new file was uploaded, update image_path accordingly
  if (req.file) {
    image_path = '/images/' + req.file.filename;
  }

  try {
    const updateQuery = `
      UPDATE prizes
      SET
        description = $1,
        cost_merits = $2,
        cost_money = $3,
        image_path = $4,
        active = $5
      WHERE prize_id = $6;
    `;
    await pool.query(updateQuery, [
      description,
      cost_merits,
      cost_money,
      image_path,
      active === 'true' || active === true,
      id
    ]);

    res.redirect('/prizes');
  } catch (err) {
    console.error('Error editing prize:', err);
    res.status(500).send('Failed to edit prize');
  }
};

