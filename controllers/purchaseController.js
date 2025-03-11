// controllers/purchaseController.js
const path = require('path');
const pool = require('../db');

// 1) Serve the purchase.html page
exports.showPurchasePage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'purchase', 'purchase.html'));
};

// 2) Return all active prizes as JSON
exports.getAllPrizes = async (req, res) => {
  try {
    const query = `
      SELECT prize_id, description, cost_merits, cost_money, image_path
      FROM prizes
      WHERE active = TRUE
      ORDER BY prize_id;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching prizes:', error);
    res.status(500).json({ error: 'Failed to fetch prizes' });
  }
};

// 3) Search Pupil by partial name
//    We can do case-insensitive match on first/last_name
exports.searchPupil = async (req, res) => {
  try {
    const { query } = req.query; // e.g. partial name
    if (!query) {
      return res.json([]); // no results if no query
    }
    const sql = `
      SELECT pupil_id, first_name, last_name, merits
      FROM pupils
      WHERE active = TRUE
        AND (LOWER(first_name) LIKE LOWER($1)
          OR LOWER(last_name) LIKE LOWER($1)
          OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER($1))
      ORDER BY last_name, first_name
      LIMIT 10;
    `;
    const likePattern = `%${query}%`;
    const result = await pool.query(sql, [likePattern]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching pupils:', error);
    res.status(500).json({ error: 'Failed to search pupils' });
  }
};

// 4) Create a Purchase (deduct merits)
exports.createPurchase = async (req, res) => {
  try {
    const { prize_id, pupil_id } = req.body;
    // Step 1: Find the prize cost
    const prizeCheck = await pool.query(`
      SELECT cost_merits
      FROM prizes
      WHERE prize_id = $1 AND active = TRUE
    `, [prize_id]);
    if (prizeCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or inactive prize' });
    }
    const cost_merits = prizeCheck.rows[0].cost_merits;

    // Step 2: Check pupil's current merits
    const pupilCheck = await pool.query(`
      SELECT pupil_id, merits
      FROM pupils
      WHERE pupil_id = $1 AND active = TRUE
    `, [pupil_id]);
    if (pupilCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or inactive pupil' });
    }
    const currentMerits = pupilCheck.rows[0].merits;

    // Step 3: Ensure pupil has enough merits
    if (currentMerits < cost_merits) {
      return res.status(400).json({
        error: 'Pupil does not have enough merits to purchase this prize.'
      });
    }

    // Step 4: Deduct merits and create purchase record
    // Usually you'd do this in a transaction for atomicity:
    await pool.query('BEGIN');

    // Update pupil's merits
    const newMerits = currentMerits - cost_merits;
    await pool.query(`
      UPDATE pupils
      SET merits = $1
      WHERE pupil_id = $2
    `, [newMerits, pupil_id]);

    // Insert into purchase table
    // e.g. date = NOW(), merit_cost_at_time = cost_merits, active = TRUE
    await pool.query(`
      INSERT INTO purchase (pupil_id, prize_id, merit_cost_at_time, date, active)
      VALUES ($1, $2, $3, NOW(), TRUE)
    `, [pupil_id, prize_id, cost_merits]);

    await pool.query('COMMIT');

    // Respond with success & updated merits
    res.json({ success: true, newMerits });
  } catch (error) {
    console.error('Error creating purchase:', error);
    // If there's an open transaction, rollback
    try { await pool.query('ROLLBACK'); } catch (e) {}
    res.status(500).json({ error: 'Failed to create purchase' });
  }
};

