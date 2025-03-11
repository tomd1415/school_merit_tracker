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

/**
 * Handle CSV file upload & parse. For each row:
 * 1) Check if pupil with same first_name & last_name already exists.
 * 2) If not, insert a new pupil record.
 */
exports.uploadPupilCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No CSV file uploaded.');
    }

    // The CSV file is temporarily stored at req.file.path
    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())  // parse the CSV
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', async () => {
        // Now we have all rows in results
        let insertedCount = 0;
        let skippedCount = 0;

        for (const row of results) {
          // Expect row.first_name, row.last_name, row.form_id
          const first_name = row.first_name?.trim();
          const last_name = row.last_name?.trim();
          const form_id = row.form_id ? parseInt(row.form_id, 10) : null;

          // Basic validation
          if (!first_name || !last_name || !form_id) {
            // You could skip or log an error. For now, skip.
            skippedCount++;
            continue;
          }

          // Check if a pupil with same first & last name exists
          const checkQuery = `
            SELECT pupil_id 
            FROM pupils 
            WHERE LOWER(first_name) = LOWER($1) 
              AND LOWER(last_name) = LOWER($2)
            LIMIT 1;
          `;
          const checkResult = await pool.query(checkQuery, [first_name, last_name]);

          if (checkResult.rowCount > 0) {
            // Already exists, skip insertion
            skippedCount++;
          } else {
            // Insert new pupil
            const insertQuery = `
              INSERT INTO pupils (first_name, last_name, merits, form_id, active)
              VALUES ($1, $2, 0, $3, true);
            `;
            await pool.query(insertQuery, [first_name, last_name, form_id]);
            insertedCount++;
          }
        }

        // Optionally delete the temp file
        fs.unlinkSync(req.file.path);

        // Provide some feedback
        res.send(`Upload complete. Inserted: ${insertedCount}, Skipped (duplicates or invalid): ${skippedCount}.`);
      });
  } catch (err) {
    console.error('Error uploading CSV:', err);
    res.status(500).send('Failed to process CSV file.');
  }
};

/**
 * POST /upload/csv/merits
 * Expects a CSV with "first_name,last_name,merits".
 * For each row, update the pupil's total merits to the CSV value.
 * If no pupil found, collect that name and return it as "missing".
 */
exports.uploadMeritsCSV = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file provided.' });
  }

  const missing = [];
  let updatedCount = 0;

  // Read the uploaded file
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      // We'll store each row for processing later or do immediate updates. 
      // Let's do immediate updates for demonstration. 
      // But be aware we might do a large number of queries in quick succession.
      // For more advanced usage, you'd queue these or do them in "end" event.
      // However, for simplicity, let's collect them and handle in .on('end') 
      // to use async/await properly.
    })
    .on('end', async () => {
      // Actually, let's parse the entire CSV into an array first:
      // But we need to restructure the code a bit. We'll do that approach below.

      // We realized we need the data from each row, so let's parse differently:
    });
};

/*
 * We'll store rows in an array. Let's rewrite for clarity:
 */

exports.uploadMeritsCSV = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file provided.' });
  }

  const rows = [];
  const missing = [];
  let updatedCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      rows.push(row);
    })
    .on('end', async () => {
      // Now we have all rows in `rows`
      // We'll process each row with async/await so we can do DB queries in sequence
      for (const row of rows) {
        const first_name = (row.first_name || '').trim();
        const last_name = (row.last_name || '').trim();
        const meritsStr = (row.merits || '').trim();
        const merits = parseInt(meritsStr, 10);

        // Basic validation
        if (!first_name || !last_name || isNaN(merits)) {
          // skip invalid row
          continue;
        }

        try {
          // Check if pupil exists
          const checkQuery = `
            SELECT pupil_id
            FROM pupils
            WHERE LOWER(first_name) = LOWER($1)
              AND LOWER(last_name) = LOWER($2)
            LIMIT 1;
          `;
          const checkResult = await pool.query(checkQuery, [first_name, last_name]);

          if (checkResult.rowCount === 0) {
            // Not found, push to missing
            missing.push(`${first_name} ${last_name}`);
          } else {
            // We found them, update merits
            const pupilId = checkResult.rows[0].pupil_id;
            const updateQuery = `
              UPDATE pupils
              SET merits = $1
              WHERE pupil_id = $2;
            `;
            await pool.query(updateQuery, [merits, pupilId]);
            updatedCount++;
          }
        } catch (err) {
          console.error('DB error updating merits:', err);
          // We could continue or break. Let's continue for now.
        }
      }

      // Cleanup the temp file
      fs.unlinkSync(req.file.path);

      // Return JSON with updatedCount & missing
      res.json({
        updatedCount,
        missing,
      });
    })
    .on('error', (err) => {
      console.error('Error reading CSV:', err);
      res.status(500).json({ error: 'Error reading CSV file.' });
    });
};

