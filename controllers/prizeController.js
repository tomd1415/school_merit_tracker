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
        p.prize_id,
        p.description,
        p.cost_merits,
        p.cost_money,
        p.image_path,
        p.active,
        p.total_stocked_ever,
        p.stock_adjustment,
        p.is_cycle_limited,
        p.spaces_per_cycle,
        p.cycle_weeks,
        p.reset_day_iso,
        COALESCE(ps.current_stock, 0) AS current_stock
      FROM prizes p
      LEFT JOIN prize_stock ps ON p.prize_id = ps.prize_id
      ORDER BY p.active DESC, p.description ASC
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
    const { description, cost_merits, cost_money } = req.body;
    const is_cycle_limited = req.body.is_cycle_limited === 'true' || req.body.is_cycle_limited === 'on';
    const spaces_per_cycle = Math.max(0, parseInt(req.body.spaces_per_cycle ?? '0', 10) || 0);
    const rawCycleWeeks = parseInt(req.body.cycle_weeks ?? '0', 10);
    const cycle_weeks = Math.min(52, Math.max(0, isNaN(rawCycleWeeks) ? 0 : rawCycleWeeks));
    const rawResetDay = parseInt(req.body.reset_day_iso ?? '1', 10);
    const reset_day_iso = Math.min(7, Math.max(1, isNaN(rawResetDay) ? 1 : rawResetDay));

    if (!req.file) {
      // Return an error in JSON
      return res.status(400).json({ error: 'Image upload required' });
    }
    const image_path = '/images/' + req.file.filename;

    const insertQuery = `
      INSERT INTO prizes 
        (description, cost_merits, cost_money, image_path, total_stocked_ever, stock_adjustment, is_cycle_limited, spaces_per_cycle, cycle_weeks, reset_day_iso, active)
      VALUES 
        ($1, $2, $3, $4, 0, 0, $5, $6, $7, $8, true);
    `;
    await pool.query(insertQuery, [
      description,
      cost_merits,
      cost_money,
      image_path,
      is_cycle_limited,
      spaces_per_cycle,
      cycle_weeks,
      reset_day_iso
    ]);

    // Return a JSON success response. The front-end checks "response.ok"
    // and won't attempt to parse a redirect as JSON
    return res.json({ success: true });
  } catch (err) {
    console.error('Error adding prize:', err);
    return res.status(500).json({ error: 'Failed to add prize' });
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
        active,
        is_cycle_limited,
        spaces_per_cycle,
        cycle_weeks,
        reset_day_iso
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
 * Lightweight toggle for stock mode (cycle vs total) from inline UI
 */
exports.setStockMode = async (req, res) => {
  const { id } = req.params;
  const raw = req.body.is_cycle_limited;
  const isCycle = (raw === true || raw === 'true' || raw === 'on' || raw === '1' || raw === 1);
  try {
    const result = await pool.query(
      `UPDATE prizes SET is_cycle_limited = $1 WHERE prize_id = $2 RETURNING is_cycle_limited`,
      [isCycle, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prize not found' });
    }
    return res.json({ success: true, is_cycle_limited: result.rows[0].is_cycle_limited });
  } catch (err) {
    console.error('Error toggling stock mode:', err);
    return res.status(500).json({ error: 'Failed to toggle stock mode' });
  }
};

/**
 * Handle "Edit Prize" form submission.
 * Update the record in the DB.
 *
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
*/
/**
 * Delete a prize.
 * This example does a real DELETE. 
 * If you prefer a "soft delete," do: UPDATE prizes SET active=false WHERE prize_id=$1.
 */
exports.deletePrize = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`
      UPDATE prizes
         SET active = false
       WHERE prize_id = $1
    `, [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting prize (soft delete):', err);
    return res.status(500).json({ error: 'Failed to delete prize' });
  }
};

/*exports.addPrize = async (req, res) => {
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
*/
/**
 * Handle "Edit Prize" form submission.
 */
exports.editPrize = async (req, res) => {
  const { id } = req.params;
  let { total_stocked_ever, description, cost_merits, cost_money, active, is_cycle_limited, spaces_per_cycle, cycle_weeks, reset_day_iso } = req.body;

  // We still handle image
  let image_path = req.body.image_path || '';
  if (req.file) {
    image_path = '/images/' + req.file.filename;
  }

  // 1) If total_stocked_ever is provided, parse it and update
  if (typeof total_stocked_ever !== 'undefined') {
    const newTSE = parseInt(total_stocked_ever, 10);
    if (isNaN(newTSE)) {
      return res.status(400).json({ error: 'total_stocked_ever must be an integer' });
    }
    await pool.query(`
      UPDATE prizes
         SET total_stocked_ever = $1
       WHERE prize_id = $2
    `, [newTSE, id]);
  }

  // 2) For the rest, if a field is omitted, we could keep its old value
  //    or treat an undefined as "no change." Let's do "no change" by
  //    reading the existing row from DB first:
  const prizeResult = await pool.query('SELECT * FROM prizes WHERE prize_id = $1', [id]);
  if (prizeResult.rowCount === 0) {
    return res.status(404).json({ error: 'Prize not found' });
  }
  const existing = prizeResult.rows[0];

  // If user didn't provide cost_merits, fall back to existing
  if (typeof cost_merits === 'undefined') cost_merits = existing.cost_merits;
  // If user didn't provide cost_money, fall back to existing
  if (typeof cost_money === 'undefined') cost_money = existing.cost_money;
  // If user didn’t provide active, fall back to existing
  if (typeof active === 'undefined') active = existing.active;
  // If user didn't provide is_cycle_limited, fall back
  if (typeof is_cycle_limited === 'undefined') is_cycle_limited = existing.is_cycle_limited;
  // If user didn't provide spaces_per_cycle, fall back
  if (typeof spaces_per_cycle === 'undefined') spaces_per_cycle = existing.spaces_per_cycle;
  // If user didn't provide cycle_weeks, fall back
  if (typeof cycle_weeks === 'undefined') cycle_weeks = existing.cycle_weeks;
  // If user didn't provide reset_day_iso, fall back
  if (typeof reset_day_iso === 'undefined') reset_day_iso = existing.reset_day_iso;
  // If user didn’t provide description, fallback
  if (typeof description === 'undefined') description = existing.description;
  // If user didn’t provide image_path in body or file, fallback
  if (!req.file && !req.body.image_path) image_path = existing.image_path;

  // Parse boolean + integers with bounds
  is_cycle_limited = (is_cycle_limited === 'true' || is_cycle_limited === true || is_cycle_limited === 'on' || is_cycle_limited === 1 || is_cycle_limited === '1');
  spaces_per_cycle = Math.max(0, parseInt(spaces_per_cycle, 10) || 0);
  cycle_weeks = Math.min(52, Math.max(0, parseInt(cycle_weeks, 10) || 0));
  reset_day_iso = Math.min(7, Math.max(1, parseInt(reset_day_iso, 10) || 1));

  // 3) Now do the final update for all these fields
  try {
    const updateQuery = `
      UPDATE prizes
         SET description  = $1,
             cost_merits  = $2,
             cost_money   = $3,
             image_path   = $4,
             active       = $5,
             is_cycle_limited = $6,
             spaces_per_cycle = $7,
             cycle_weeks = $8,
             reset_day_iso = $9
       WHERE prize_id = $10
    `;
    await pool.query(updateQuery, [
      description,
      cost_merits,
      cost_money,
      image_path,
      (active === 'true' || active === true),
      is_cycle_limited,
      spaces_per_cycle,
      cycle_weeks,
      reset_day_iso,
      id
    ]);
if (typeof req.body.stock_adjustment !== 'undefined') {
  if (is_cycle_limited) {
    return res.status(400).json({ error: "stock_adjustment is not used for cycle-based prizes" });
  }
  const userValue = parseInt(req.body.stock_adjustment, 10); 
  if (isNaN(userValue)) {
    return res.status(400).json({ error: "stock_adjustment must be an integer" });
  }

  // 1) get the old value from the DB
  const oldResult = await pool.query(`
    SELECT stock_adjustment
      FROM prizes
     WHERE prize_id = $1
  `, [id]);
  if (oldResult.rowCount === 0) {
    return res.status(404).json({ error: 'Prize not found' });
  }
  const oldAdjustment = oldResult.rows[0].stock_adjustment;

  // 2) compute the new value
  const newAdjustment = oldAdjustment + userValue;

  // 3) update in DB
  await pool.query(`
    UPDATE prizes
       SET stock_adjustment = $1
     WHERE prize_id = $2
  `, [newAdjustment, id]);
}
    // If it's an inline update, you might respond with JSON.
    // If it's a form submission, you might redirect. 
    // Just be consistent with your front-end approach:
    return res.json({ success: true });
  } catch (err) {
    console.error('Error editing prize:', err);
    return res.status(500).json({ error: 'Failed to edit prize' });
  }
};
