// controllers/csvController.js
const path = require('path');
const pool = require('../db');
const fs = require('fs');
const csv = require('csv-parser');

const IGNORE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS merit_import_ignore (
    id         SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name  TEXT NOT NULL,
    key_lower  TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

const ensureIgnoreTable = async () => {
  await pool.query(IGNORE_TABLE_SQL);
};

const nameKey = (first, last) => {
  const f = (first || '').trim().toLowerCase();
  const l = (last || '').trim().toLowerCase();
  return `${f}|${l}`;
};

/**
 * Show the CSV Upload page for Pupils.
 */
exports.showUploadPupilCSVPage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'uploadCSV', 'uploadCSV.html'));
};

exports.showUploadMeritsCSVPage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'uploadMeritsCSV', 'uploadMeritsCSV.html'));
};

/**
 * Handle CSV file upload & parse. For each row:
 * 1) Check if pupil with same first_name & last_name already exists.
 * 2) If not, insert a new pupil record.
 */
exports.uploadPupilCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded.' });
  }

  const rows = [];
  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const first_name = row.first_name?.trim();
      const last_name = row.last_name?.trim();
      const form_id = row.form_id ? parseInt(row.form_id, 10) : null;

      if (!first_name || !last_name || !form_id) {
        skippedCount++;
        continue;
      }

      const checkResult = await pool.query(
        `
          SELECT pupil_id 
            FROM pupils 
           WHERE LOWER(first_name) = LOWER($1) 
             AND LOWER(last_name)  = LOWER($2)
           LIMIT 1;
        `,
        [first_name, last_name]
      );

      if (checkResult.rowCount > 0) {
        skippedCount++;
        continue;
      }

      await pool.query(
        `
          INSERT INTO pupils (first_name, last_name, merits, form_id, active)
          VALUES ($1, $2, 0, $3, true);
        `,
        [first_name, last_name, form_id]
      );
      insertedCount++;
    }

    await fs.promises.unlink(req.file.path).catch(() => {});

    return res.json({
      message: `Upload complete. Inserted: ${insertedCount}, Skipped (duplicates or invalid): ${skippedCount}.`,
      insertedCount,
      skippedCount
    });
  } catch (err) {
    console.error('Error uploading CSV:', err);
    await fs.promises.unlink(req.file.path).catch(() => {});
    return res.status(500).json({ error: 'Failed to process CSV file.' });
  }
};

/**
 * POST /upload/csv/merits
 * Accepts CSV in either:
 *  - Source format: columns "Name" and "Points" (aggregates by name)
 *  - Converted format: "first_name", "last_name", "merits"
 *
 * Behaviour:
 *  - Case-insensitive matching on names.
 *  - Never decrease merits: uses max(existing, incoming).
 *  - Returns missing pupils for user decisions and honours an ignore-forever list.
 */
exports.uploadMeritsCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file provided.' });
  }

  const rows = [];
  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });
  } catch (err) {
    console.error('Error reading CSV:', err);
    await fs.promises.unlink(req.file.path).catch(() => {});
    return res.status(500).json({ error: 'Error reading CSV file.' });
  }

  const aggregated = new Map();
  const addAggregate = (first_name, last_name, merits) => {
    if (!first_name || !last_name || !Number.isFinite(merits)) return;
    const key = nameKey(first_name, last_name);
    const existing = aggregated.get(key) || { first_name, last_name, merits: 0 };
    existing.merits += merits;
    aggregated.set(key, existing);
  };

  for (const row of rows) {
    // Source format: Name + Points
    if (row.Name && row.Points) {
      const name = (row.Name || '').trim();
      const parts = name.split(/\s+/, 2);
      const first_name = parts[0] || '';
      const last_name = parts[1] || '';
      const pts = parseInt(String(row.Points).trim(), 10);
      if (!isNaN(pts)) {
        addAggregate(first_name, last_name, pts);
        continue;
      }
    }

    // Converted format
    const first_name = (row.first_name || row.First_name || '').trim();
    const last_name = (row.last_name || row.Last_name || '').trim();
    const meritsStr = (row.merits || row.Merits || row.points || '').toString().trim();
    const merits = parseInt(meritsStr, 10);
    if (!isNaN(merits)) {
      addAggregate(first_name, last_name, merits);
    }
  }

  await ensureIgnoreTable();
  const ignoreRows = await pool.query('SELECT key_lower FROM merit_import_ignore');
  const ignoreSet = new Set(ignoreRows.rows.map(r => r.key_lower));

  const missingPupils = [];
  const lowerKept = [];
  let updatedCount = 0;
  let unchangedCount = 0;
  let ignoredCount = 0;

  for (const [key, entry] of aggregated.entries()) {
    if (ignoreSet.has(key)) {
      ignoredCount++;
      continue;
    }

    const { first_name, last_name, merits } = entry;
    try {
      const checkResult = await pool.query(
        `
          SELECT pupil_id, merits
            FROM pupils
           WHERE active = TRUE
             AND LOWER(first_name) = LOWER($1)
             AND LOWER(last_name)  = LOWER($2)
           LIMIT 1;
        `,
        [first_name, last_name]
      );

      if (checkResult.rowCount === 0) {
        missingPupils.push({ first_name, last_name, merits });
        continue;
      }

      const pupil = checkResult.rows[0];
      const desiredMerits = Math.max(pupil.merits, merits);

      if (desiredMerits > pupil.merits) {
        await pool.query(
          `UPDATE pupils SET merits = $1 WHERE pupil_id = $2`,
          [desiredMerits, pupil.pupil_id]
        );
        updatedCount++;
      } else {
        unchangedCount++;
      }

      if (merits < pupil.merits) {
        lowerKept.push(`${first_name} ${last_name}`);
      }
    } catch (err) {
      console.error('DB error updating merits:', err);
    }
  }

  await fs.promises.unlink(req.file.path).catch(() => {});

  return res.json({
    message: 'Upload complete.',
    updatedCount,
    unchangedCount,
    ignoredCount,
    lowerKept,
    missingPupils
  });
};

exports.ignoreMeritPupils = async (req, res) => {
  const { pupils } = req.body || {};
  if (!Array.isArray(pupils) || pupils.length === 0) {
    return res.status(400).json({ error: 'No pupils provided to ignore.' });
  }

  await ensureIgnoreTable();
  let inserted = 0;

  for (const p of pupils) {
    const first_name = (p.first_name || '').trim();
    const last_name = (p.last_name || '').trim();
    if (!first_name || !last_name) continue;
    const key_lower = nameKey(first_name, last_name);
    try {
      const result = await pool.query(
        `
          INSERT INTO merit_import_ignore (first_name, last_name, key_lower)
          VALUES ($1, $2, $3)
          ON CONFLICT (key_lower) DO NOTHING
          RETURNING id
        `,
        [first_name, last_name, key_lower]
      );
      if (result.rowCount > 0) inserted++;
    } catch (err) {
      console.error('Error inserting ignore pupil:', err);
    }
  }

  return res.json({ success: true, inserted });
};

exports.addMissingPupil = async (req, res) => {
  const { first_name, last_name, merits, form_id } = req.body || {};
  const fn = (first_name || '').trim();
  const ln = (last_name || '').trim();
  const meritsVal = parseInt(merits, 10);
  const formIdVal = parseInt(form_id, 10);

  if (!fn || !ln || isNaN(meritsVal) || meritsVal < 0 || isNaN(formIdVal)) {
    return res.status(400).json({ error: 'Invalid pupil data supplied.' });
  }

  try {
    const formCheck = await pool.query(
      `SELECT form_id FROM form WHERE form_id = $1 AND active = TRUE`,
      [formIdVal]
    );
    if (formCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Form not found or inactive.' });
    }

    const existing = await pool.query(
      `
        SELECT pupil_id FROM pupils
         WHERE active = TRUE
           AND LOWER(first_name) = LOWER($1)
           AND LOWER(last_name)  = LOWER($2)
         LIMIT 1;
      `,
      [fn, ln]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Pupil already exists.' });
    }

    await pool.query(
      `
        INSERT INTO pupils (first_name, last_name, merits, form_id, active)
        VALUES ($1, $2, $3, $4, TRUE)
      `,
      [fn, ln, meritsVal, formIdVal]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Error adding missing pupil:', err);
    return res.status(500).json({ error: 'Failed to add pupil.' });
  }
};
