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

    // 2) Check pupil’s current *remaining* merits using the view
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

    // 3) Ensure pupil has enough remaining merits
    if (currentRemaining < cost_merits) {
      return res.status(400).json({
        error: `Not enough merits. Pupil has ${currentRemaining} left, needs ${cost_merits}.`
      });
    }

    // 4) Insert into purchase (do NOT update pupils.merits)
    await pool.query(`
      INSERT INTO purchase (pupil_id, prize_id, merit_cost_at_time, date, active)
      VALUES ($1, $2, $3, NOW(), TRUE)
    `, [pupil_id, prize_id, cost_merits]);

    // Done
    return res.json({ 
      success: true, 
      newRemaining: currentRemaining - cost_merits // if you want to show the updated leftover 
    });
  } catch (err) {
    console.error('Error creating purchase:', err);
    res.status(500).json({ error: 'Failed to create purchase' });
  }
};
