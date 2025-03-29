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

// Set up view engine for rendering dynamic content
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve all files in the public folder (CSS, JS, images, HTML, etc.)
app.use(express.static(path.join(__dirname, 'public')));

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

// Homepage route - serve static HTML
app.get('/', (req, res) => {
  // Serve the static index.html file
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

