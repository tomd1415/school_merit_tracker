// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const prizeRoutes = require('./routes/prizeRoutes');
const csvRoutes = require('./routes/csvRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const pinRoutes = require('./routes/pinRoutes');
const { requireFullAccess } = require('./middlewares/auth');

// Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize session BEFORE routes
app.use(session({
  secret: 'hskKY46hssppqiu99she527h',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
  }
}));

// Serve all files in the public folder (CSS, JS, images, HTML, etc.)
app.use(express.static(path.join(__dirname, 'public')));

console.log('Database Host:', process.env.DB_HOST);
// Import routes
const pupilRoutes = require('./routes/pupilRoutes');

// Add route to serve forms page with authentication
app.get('/forms', requireFullAccess, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forms', 'forms.html'));
});

const formsRouter = require('./routes/forms');
app.use('/forms', formsRouter);

// Attach /pupils routes
app.use('/pupils', pupilRoutes);
app.use('/prizes', prizeRoutes);
app.use('/upload/csv', csvRoutes);
app.use('/purchase', purchaseRoutes);
app.use('/', pinRoutes);  // or app.use(pinRoutes);

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

