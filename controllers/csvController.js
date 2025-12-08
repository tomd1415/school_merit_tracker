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

// Normalise a CSV row's keys so BOMs / spaces / case differences don't break detection
const normaliseRow = (row) => {
  const out = {};
  for (const key of Object.keys(row)) {
    const cleanKey = key
      .replace(/^\uFEFF/, '')        // strip BOM
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');        // "Form Group" -> "form_group"
    out[cleanKey] = row[key];
  }
  return out;
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
    const missingForms = new Set();

    const formRows = await pool.query('SELECT form_id, form_name FROM form WHERE active = TRUE');
    const formMap = new Map(formRows.rows.map(f => [f.form_name.trim().toLowerCase(), f.form_id]));

    for (const row of rows) {
      // Accept either first_name/last_name OR combined Name column
      let first_name = (row.first_name || '').trim();
      let last_name = (row.last_name || '').trim();
      if ((!first_name || !last_name) && row.Name) {
        const parts = row.Name.trim().split(/\s+/, 2);
        first_name = parts[0] || '';
        last_name = parts[1] || '';
      }

      const formIdRaw = row.form_id ? parseInt(row.form_id, 10) : null;
      const formNameRaw = (row.form_name || row.form || row['Form Group'] || '').toString().trim();
      let form_id = formIdRaw;

      if (!first_name || !last_name) {
        skippedCount++;
        continue;
      }

      if (!form_id && formNameRaw) {
        const match = formMap.get(formNameRaw.toLowerCase());
        if (match) {
          form_id = match;
        } else {
          missingForms.add(formNameRaw);
          skippedCount++;
          continue;
        }
      }

      if (!form_id) {
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
      skippedCount,
      missingForms: Array.from(missingForms)
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

  const boolVal = (v) => v === true || v === 'true' || v === 'on' || v === '1' || v === 1;
  const addMissingPupils = boolVal(req.body?.addMissingPupils);
  const createForms = boolVal(req.body?.createForms);
  const updateFormFromCsv = boolVal(req.body?.updateFormFromCsv);

  const parseYear = (raw) => {
    const match = `${raw || ''}`.match(/(\d{1,2})/);
    return match ? parseInt(match[1], 10) : null;
  };

  const aggregated = new Map();
  const addAggregate = (first_name, last_name, merits, form_name, year_group) => {
    if (!first_name || !last_name || !Number.isFinite(merits)) return;
    const key = nameKey(first_name, last_name);
    const existing = aggregated.get(key) || { first_name, last_name, merits: 0, form_name: '', year_group: null };
    existing.merits += merits;
    if (form_name) existing.form_name = form_name;
    if (year_group != null) existing.year_group = year_group;
    aggregated.set(key, existing);
  };

  for (const raw of rows) {
    const row = normaliseRow(raw);

    // Source format: Name + Points (+ Form Group, Year Group)
    if (row.name && row.points) {
      const name = (row.name || '').trim();
      const parts = name.split(/\s+/, 2);
      const first_name = parts[0] || '';
      const last_name = parts[1] || '';
      const pts = parseInt(String(row.points).trim(), 10);
      const form_name = (row.form_group || row.form || row.form_name || '').toString().trim();
      const year_group = parseYear(row.year_group);
      if (!isNaN(pts)) {
        addAggregate(first_name, last_name, pts, form_name, year_group);
        continue;
      }
    }

    // Converted / already aggregated format
    const first_name = (row.first_name || row.first || '').trim();
    const last_name = (row.last_name || row.last || '').trim();
    const meritsStr = (row.merits || row.points || row.total || '').toString().trim();
    const merits = parseInt(meritsStr, 10);
    const form_name = (row.form_name || row.form || row.form_group || '').toString().trim();
    const year_group = parseYear(row.year_group);
    if (!isNaN(merits)) {
      addAggregate(first_name, last_name, merits, form_name, year_group);
    }
  }

  // Cache forms
  const formsResult = await pool.query('SELECT form_id, form_name, year_group FROM form WHERE active = TRUE');
  const formCache = new Map(formsResult.rows.map(f => [f.form_name.trim().toLowerCase(), f]));
  const createdForms = [];
  const ensureForm = async (form_name, year_group) => {
    if (!form_name) return null;
    const key = form_name.trim().toLowerCase();
    if (formCache.has(key)) return formCache.get(key).form_id;
    if (!createForms) return null;
    if (year_group == null || Number.isNaN(year_group)) return null;
    try {
      const insert = await pool.query(
        `
          INSERT INTO form (form_name, form_tutor, year_group, active)
          VALUES ($1, $2, $3, TRUE)
          RETURNING form_id, form_name, year_group
        `,
        [form_name.trim(), 'Unknown', year_group]
      );
      const rec = insert.rows[0];
      formCache.set(key, rec);
      createdForms.push(rec.form_name);
      return rec.form_id;
    } catch (err) {
      console.error('Error creating form:', err);
      return null;
    }
  };

  await ensureIgnoreTable();
  const ignoreRows = await pool.query('SELECT key_lower FROM merit_import_ignore');
  const ignoreSet = new Set(ignoreRows.rows.map(r => r.key_lower));

  const missingPupils = [];
  const lowerKept = [];
  const addedPupils = [];
  const formUpdateFailures = [];
  let formUpdates = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let ignoredCount = 0;

  for (const [key, entry] of aggregated.entries()) {
    if (ignoreSet.has(key)) {
      ignoredCount++;
      continue;
    }

    const { first_name, last_name, merits, form_name, year_group } = entry;
    try {
      const checkResult = await pool.query(
        `
          SELECT pupil_id, merits, form_id
            FROM pupils
           WHERE active = TRUE
             AND LOWER(first_name) = LOWER($1)
             AND LOWER(last_name)  = LOWER($2)
           LIMIT 1;
        `,
        [first_name, last_name]
      );

      if (checkResult.rowCount === 0) {
        if (addMissingPupils) {
          const formId = await ensureForm(form_name, year_group);
          if (formId) {
            await pool.query(
              `
                INSERT INTO pupils (first_name, last_name, merits, form_id, active)
                VALUES ($1, $2, $3, $4, TRUE)
              `,
              [first_name, last_name, Math.max(0, merits), formId]
            );
            addedPupils.push({ first_name, last_name, merits, form_name, year_group });
          } else {
            missingPupils.push({ first_name, last_name, merits, form_name, year_group, reason: 'Form not found' });
          }
        } else {
          missingPupils.push({ first_name, last_name, merits, form_name, year_group, reason: 'Pupil not found' });
        }
        continue;
      }

      const pupil = checkResult.rows[0];
      // Replace only if the CSV total is higher than current
      const desiredMerits = Math.max(pupil.merits, merits);

      if (desiredMerits > pupil.merits) {
        await pool.query(
          `UPDATE pupils SET merits = $1 WHERE pupil_id = $2`,
          [desiredMerits, pupil.pupil_id]
        );
        updatedCount++;
      } else {
        unchangedCount++;
        if (merits < pupil.merits) {
          lowerKept.push(`${first_name} ${last_name}`);
        }
      }

      if (updateFormFromCsv && form_name) {
        const targetFormId = await ensureForm(form_name, year_group);
        if (targetFormId && targetFormId !== pupil.form_id) {
          await pool.query(
            `UPDATE pupils SET form_id = $1 WHERE pupil_id = $2`,
            [targetFormId, pupil.pupil_id]
          );
          formUpdates++;
        } else if (!targetFormId && form_name) {
          formUpdateFailures.push({ first_name, last_name, form_name, year_group });
        }
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
    missingPupils,
    addedPupils,
    createdForms,
    formUpdates,
    formUpdateFailures
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
