// controllers/orderController.js
const path = require('path');
const pool = require('../db');

const isValidDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

// Serve the Orders page
exports.showOrdersPage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'orders', 'orders.html'));
};

// Provide filter data (forms and year groups)
exports.getFilters = async (_req, res) => {
  try {
    const formResult = await pool.query(`
      SELECT form_id, form_name, year_group
      FROM form
      WHERE active = TRUE
      ORDER BY year_group, form_name
    `);
    res.json({ forms: formResult.rows });
  } catch (error) {
    console.error('Error fetching order filters:', error);
    res.status(500).json({ error: 'Failed to load filters' });
  }
};

// List orders with optional filters
exports.listOrders = async (req, res) => {
  try {
    const {
      mode = 'current',
      yearGroup,
      formId,
      pupilId,
      startDate,
      endDate,
      status,
      search
    } = req.query;

    const filters = [];
    const params = [];

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Pending/unfulfilled by default
    if (mode !== 'all') {
      filters.push(`COALESCE(pu.status, 'pending') = 'pending'`);
    } else if (status && ['pending', 'collected', 'refunded'].includes(status)) {
      params.push(status);
      filters.push(`COALESCE(pu.status, 'pending') = $${params.length}`);
    }

    if (yearGroup) {
      params.push(yearGroup);
      filters.push(`f.year_group = $${params.length}`);
    }

    if (formId) {
      params.push(formId);
      filters.push(`p.form_id = $${params.length}`);
    }

    if (pupilId) {
      params.push(pupilId);
      filters.push(`p.pupil_id = $${params.length}`);
    }

    if (search) {
      const likePattern = `%${search}%`;
      params.push(likePattern);
      const idx = params.length;
      filters.push(`
        (
          LOWER(p.first_name) LIKE LOWER($${idx})
          OR LOWER(p.last_name) LIKE LOWER($${idx})
          OR LOWER(CONCAT(p.first_name, ' ', p.last_name)) LIKE LOWER($${idx})
        )
      `);
    }

    if (startDate) {
      if (!isValidDateString(startDate)) {
        return res.status(400).json({ error: 'Invalid start date format' });
      }
      params.push(startDate);
      filters.push(`DATE(pu.date) >= $${params.length}::date`);
    }

    if (endDate) {
      if (!isValidDateString(endDate)) {
        return res.status(400).json({ error: 'Invalid end date format' });
      }
      params.push(endDate);
      filters.push(`DATE(pu.date) <= $${params.length}::date`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const query = `
      SELECT 
        pu.purchase_id,
        COALESCE(pu.status, 'pending') AS status,
        pu.date,
        pu.fulfilled_at,
        pu.merit_cost_at_time,
        pu.active,
        p.pupil_id,
        p.first_name,
        p.last_name,
        p.form_id,
        f.form_name,
        f.year_group,
        pr.prize_id,
        pr.description AS prize_description,
        pr.cost_merits,
        pr.image_path
      FROM purchase pu
      JOIN pupils p ON pu.pupil_id = p.pupil_id
      JOIN form f ON p.form_id = f.form_id
      JOIN prizes pr ON pu.prize_id = pr.prize_id
      ${whereClause}
      ORDER BY pu.date DESC;
    `;

    const result = await pool.query(query, params);
    const summary = result.rows.reduce((acc, row) => {
      const statusKey = row.status || 'pending';
      acc[statusKey] = (acc[statusKey] || 0) + 1;
      acc.total += 1;
      return acc;
    }, { total: 0, pending: 0, collected: 0, refunded: 0 });

    res.json({ orders: result.rows, summary });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Mark an order as collected
exports.markCollected = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const existing = await pool.query(
      `SELECT status FROM purchase WHERE purchase_id = $1`,
      [purchaseId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const currentStatus = existing.rows[0].status || 'pending';
    if (currentStatus === 'refunded') {
      return res.status(400).json({ error: 'Refunded purchases cannot be collected' });
    }

    const updateResult = await pool.query(
      `
        UPDATE purchase
        SET status = 'collected',
            fulfilled_at = COALESCE(fulfilled_at, NOW())
        WHERE purchase_id = $1
        RETURNING purchase_id, status, fulfilled_at
      `,
      [purchaseId]
    );

    return res.json({
      success: true,
      order: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error marking collected:', error);
    res.status(500).json({ error: 'Failed to mark as collected' });
  }
};

// Mark an order as refunded (and return APs)
exports.markRefunded = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const existing = await pool.query(
      `SELECT pupil_id, status FROM purchase WHERE purchase_id = $1`,
      [purchaseId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const { pupil_id, status } = existing.rows[0];
    if (status === 'refunded') {
      const meritResult = await pool.query(
        `SELECT remaining_merits FROM pupil_remaining_merits WHERE pupil_id = $1`,
        [pupil_id]
      );
      const updatedMerits = meritResult.rowCount > 0 ? meritResult.rows[0].remaining_merits : null;
      return res.json({
        success: true,
        message: 'Purchase already refunded',
        updatedMerits
      });
    }

    const updateResult = await pool.query(
      `
        UPDATE purchase
        SET status = 'refunded',
            active = FALSE,
            fulfilled_at = COALESCE(fulfilled_at, NOW())
        WHERE purchase_id = $1
        RETURNING purchase_id, status, fulfilled_at
      `,
      [purchaseId]
    );

    const meritResult = await pool.query(
      `SELECT remaining_merits FROM pupil_remaining_merits WHERE pupil_id = $1`,
      [pupil_id]
    );
    const updatedMerits = meritResult.rowCount > 0 ? meritResult.rows[0].remaining_merits : null;

    return res.json({
      success: true,
      order: updateResult.rows[0],
      updatedMerits
    });
  } catch (error) {
    console.error('Error marking refunded:', error);
    res.status(500).json({ error: 'Failed to refund purchase' });
  }
};
