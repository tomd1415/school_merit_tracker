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
      SELECT 
        p.prize_id, 
        p.description, 
        p.cost_merits, 
        p.cost_money, 
        p.image_path,
        p.is_cycle_limited,
        p.spaces_per_cycle,
        p.cycle_weeks,
        p.reset_day_iso,
        COALESCE(ps.current_stock, 0) AS current_stock
      FROM prizes p
      LEFT JOIN prize_stock ps ON p.prize_id = ps.prize_id
      WHERE p.active = TRUE
      ORDER BY p.prize_id;
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

    const sql = `
      SELECT 
        p.pupil_id,
        p.first_name,
        p.last_name,
        p.form_id,
        f.form_name,
        f.year_group,
        pr.remaining_merits AS merits
      FROM pupil_remaining_merits pr
      JOIN pupils p ON pr.pupil_id = p.pupil_id
      JOIN form f ON p.form_id = f.form_id
      WHERE 
        LOWER(p.first_name) LIKE LOWER($1)
        OR LOWER(p.last_name) LIKE LOWER($1)
        OR LOWER(CONCAT(p.first_name, ' ', p.last_name)) LIKE LOWER($1)
      ORDER BY p.last_name, p.first_name
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

    // 1) Get the prize cost and current stock position
    const prizeCheck = await pool.query(`
      SELECT 
        p.cost_merits,
        p.is_cycle_limited,
        p.spaces_per_cycle,
        p.cycle_weeks,
        p.reset_day_iso,
        COALESCE(ps.current_stock, 0) AS current_stock
      FROM prizes p
      LEFT JOIN prize_stock ps ON ps.prize_id = p.prize_id
      WHERE p.prize_id = $1 AND p.active = TRUE
      GROUP BY p.prize_id, p.cost_merits, p.is_cycle_limited, p.spaces_per_cycle, p.cycle_weeks, p.reset_day_iso, ps.current_stock
    `, [prize_id]);
    if (prizeCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or inactive prize' });
    }
    const { cost_merits, current_stock, is_cycle_limited } = prizeCheck.rows[0];

    if ((current_stock ?? 0) <= 0) {
      const msg = is_cycle_limited ? 'No spaces left this cycle.' : 'This prize is out of stock.';
      return res.status(400).json({ error: msg });
    }

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
      INSERT INTO purchase (pupil_id, prize_id, merit_cost_at_time, date, status, active)
      VALUES ($1, $2, $3, NOW(), 'pending', TRUE)
      RETURNING purchase_id, status
    `, [pupil_id, prize_id, cost_merits]);

    // This is the newly created purchase ID
    const { purchase_id: newPurchaseId, status } = insertResult.rows[0];

    // Return both newRemaining and newPurchaseId so front-end can track it
    return res.json({ 
      success: true, 
      newRemaining: currentRemaining - cost_merits,
      newPurchaseId,
      status
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
      SELECT pupil_id, prize_id, merit_cost_at_time, status, active
      FROM purchase
      WHERE purchase_id = $1
    `, [purchaseId]);

    if (purchaseResult.rowCount === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const purchase = purchaseResult.rows[0];
    const { pupil_id, status } = purchase;

    // If already refunded, just return the latest merit balance
    if (status === 'refunded') {
      const meritResult = await pool.query(`
        SELECT remaining_merits
        FROM pupil_remaining_merits
        WHERE pupil_id = $1
      `, [pupil_id]);
      const updatedMerits = meritResult.rowCount > 0 ? meritResult.rows[0].remaining_merits : null;
      return res.json({
        success: true,
        message: 'Purchase already refunded',
        updatedMerits
      });
    }

    // Mark as refunded and inactive, record when it happened
    const result = await pool.query(`
      UPDATE purchase
      SET status = 'refunded',
          active = FALSE,
          fulfilled_at = NOW()
      WHERE purchase_id = $1
      RETURNING purchase_id
    `, [purchaseId]);

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
