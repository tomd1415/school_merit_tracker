// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

console.log('Database Host:', process.env.DB_HOST);
// Import routes
const pupilRoutes = require('./routes/pupilRoutes');

// Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve all files in the public folder (CSS, JS, images, HTML, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Attach /pupils routes
app.use('/pupils', pupilRoutes);

// Example of a default route to redirect or show a home page
app.get('/', (req, res) => {
  // Could send a landing page, or redirect to /pupils, etc.
  res.redirect('/pupils');
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

