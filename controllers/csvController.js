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

