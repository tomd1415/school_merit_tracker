// db.js
const { Pool } = require('pg');

// Adjust these details for your database
const pool = new Pool({
  user: 'YOUR_DB_USER',
  host: 'localhost',
  database: 'YOUR_DB_NAME',
  password: 'YOUR_DB_PASSWORD',
  port: 5432,
});

module.exports = pool;

