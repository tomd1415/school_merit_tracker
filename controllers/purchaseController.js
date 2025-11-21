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
// purchaseController.js
exports.searchPupil = async (req, res) => {
  try {
    const { query } = req.query; 
    if (!query) {
      return res.json([]); 
    }

    // Use the view, returning "remaining_merits" 
    // Rename "remaining_merits" as "merits" if you want the front-end 
    // to keep using "merits" consistently.
    const sql = `
      SELECT 
        pupil_id,
        first_name,
        last_name,
        remaining_merits AS merits
      FROM pupil_remaining_merits
      WHERE 
        LOWER(first_name) LIKE LOWER($1)
        OR LOWER(last_name) LIKE LOWER($1)
        OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER($1)
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

    // 1) Get the prize cost
    const prizeCheck = await pool.query(`
      SELECT cost_merits
      FROM prizes
      WHERE prize_id = $1 AND active = TRUE
    `, [prize_id]);
    if (prizeCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or inactive prize' });
    }
    const cost_merits = prizeCheck.rows[0].cost_merits;

    // 2) Check pupil's current *remaining* merits using the view
    //    pupil_remaining_merits has "pupil_id" and "remaining_merits"
    const remainCheck = await pool.query(`
      SELECT remaining_merits
      FROM pupil_remaining_merits
      WHERE pupil_id = $1
    `, [pupil_id]);
    if (remainCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or inactive pupil' });
    }
    const currentRemaining = remainCheck.rows[0].remaining_merits;

    // 3) Ensure pupil has enough remaining APs
    if (currentRemaining < cost_merits) {
      return res.status(400).json({
        error: `Not enough APs. Pupil has ${currentRemaining} left, needs ${cost_merits}.`
      });
    }

    // 4) Insert into purchase (do NOT update pupils.merits)
    const insertResult = await pool.query(`
      INSERT INTO purchase (pupil_id, prize_id, merit_cost_at_time, date, active)
      VALUES ($1, $2, $3, NOW(), TRUE)
      RETURNING purchase_id
    `, [pupil_id, prize_id, cost_merits]);

    // This is the newly created purchase ID
    const newPurchaseId = insertResult.rows[0].purchase_id;

    // Return both newRemaining and newPurchaseId so front-end can track it
    return res.json({ 
      success: true, 
      newRemaining: currentRemaining - cost_merits,
      newPurchaseId
    });
  } catch (err) {
    console.error('Error creating purchase:', err);
    res.status(500).json({ error: 'Failed to create purchase' });
  }
};
// controllers/purchaseController.js

// 5) Cancel (undo) a purchase by ID
exports.cancelPurchase = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    // First, get the purchase details to know which pupil and prize were involved
    const purchaseResult = await pool.query(`
      SELECT pupil_id, prize_id, merit_cost_at_time
      FROM purchase
      WHERE purchase_id = $1
    `, [purchaseId]);

    if (purchaseResult.rowCount === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const purchase = purchaseResult.rows[0];
    const { pupil_id, merit_cost_at_time } = purchase;

    // Delete or deactivate the purchase
    const result = await pool.query(`
      DELETE FROM purchase
      WHERE purchase_id = $1
      RETURNING purchase_id
    `, [purchaseId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // After canceling, get the updated remaining merits for the pupil
    const meritResult = await pool.query(`
      SELECT remaining_merits
      FROM pupil_remaining_merits
      WHERE pupil_id = $1
    `, [pupil_id]);

    const updatedMerits = meritResult.rowCount > 0 ? meritResult.rows[0].remaining_merits : null;

    // Return success with the updated merit count
    return res.json({ 
      success: true, 
      message: 'Purchase canceled',
      updatedMerits: updatedMerits
    });
  } catch (err) {
    console.error('Error canceling purchase:', err);
    res.status(500).json({ error: 'Failed to cancel purchase' });
  }
};
