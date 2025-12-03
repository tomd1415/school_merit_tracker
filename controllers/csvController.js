// controllers/csvController.js
const path = require('path');
const pool = require('../db');
const fs = require('fs');
const csv = require('csv-parser');

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
 * Expects a CSV with "first_name,last_name,merits".
 * For each row, update the pupil's total merits to the CSV value.
 * If no pupil found, collect that name and return it as "missing".
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

    const notFoundPupils = [];
    let updatedCount = 0;

    for (const row of rows) {
      const first_name = (row.first_name || '').trim();
      const last_name = (row.last_name || '').trim();
      const meritsStr = (row.merits || '').trim();
      const merits = parseInt(meritsStr, 10);

      if (!first_name || !last_name || isNaN(merits)) {
        continue;
      }

      try {
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

        if (checkResult.rowCount === 0) {
          notFoundPupils.push(`${first_name} ${last_name}`);
          continue;
        }

        const pupilId = checkResult.rows[0].pupil_id;
        await pool.query(
          `
            UPDATE pupils
               SET merits = $1
             WHERE pupil_id = $2;
          `,
          [merits, pupilId]
        );
        updatedCount++;
      } catch (err) {
        console.error('DB error updating merits:', err);
      }
    }

    await fs.promises.unlink(req.file.path).catch(() => {});

    return res.json({
      message: 'Upload complete.',
      updatedCount,
      notFoundPupils
    });
  } catch (err) {
    console.error('Error reading CSV:', err);
    await fs.promises.unlink(req.file.path).catch(() => {});
    return res.status(500).json({ error: 'Error reading CSV file.' });
  }
};
