// server.js
require('dotenv').config();
require('./schedulers/summaryScheduler')
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const app = express();
const prizeRoutes = require('./routes/prizeRoutes');
const csvRoutes = require('./routes/csvRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { authEnabled } = require('./config/authConfig');
const { requireFullAccess, requirePurchaseAccess } = require('./middlewares/auth');

// Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set; using a random secret for this run. Set SESSION_SECRET in the environment for stable sessions.');
}

// Initialize session BEFORE routes
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
  }
}));

// Set up view engine for rendering dynamic content
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import routes
const pupilRoutes = require('./routes/pupilRoutes');
const formsRouter = require('./routes/forms');

// Staff auth routes
const staffAuthRoutes = require('./routes/staffAuthRoutes');
app.use('/staff', staffAuthRoutes);

// Helper to check roles in middleware
function hasRole(req, role) {
  if (!authEnabled) return true;
  const user = req.session && req.session.staffUser;
  const roles = (user && user.roles) || [];
  return user && (roles.includes(role) || roles.includes('admin'));
}

// Protect direct access to HTML pages even when served statically
app.use((req, res, next) => {
  if (!authEnabled) return next();
  if (req.method !== 'GET') return next();

  const p = req.path.toLowerCase();
  if (p.startsWith('/staff')) return next(); // allow login/logout
  if (p.startsWith('/css') || p.startsWith('/js') || p.startsWith('/images') || p === '/favicon.ico' || p === '/site.webmanifest') {
    return next();
  }

  const redirectToLogin = () =>
    res.redirect(303, `/staff/login?target=${encodeURIComponent(req.originalUrl)}`);

  if (p.endsWith('.html') || p === '/' || p === '/purchase') {
    if (p.startsWith('/purchase')) {
      return hasRole(req, 'staff') ? next() : redirectToLogin();
    }
    // everything else is admin-only
    return hasRole(req, 'admin') ? next() : redirectToLogin();
  }

  return next();
});

// Serve static assets after HTML guard
app.use(express.static(path.join(__dirname, 'public')));

// Route wiring with role protection
app.use('/forms', requireFullAccess, formsRouter);
app.use('/pupils', requireFullAccess, pupilRoutes);
app.use('/prizes', requireFullAccess, prizeRoutes);
app.use('/upload/csv', requireFullAccess, csvRoutes);
app.use('/orders', requireFullAccess, orderRoutes);
app.use('/purchase', requirePurchaseAccess, purchaseRoutes);

// Homepage route - admin only, staff are redirected to /purchase
app.get('/', (req, res) => {
  if (!authEnabled) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  if (!hasRole(req, 'staff')) {
    return res.redirect(303, `/staff/login?target=${encodeURIComponent(req.originalUrl)}`);
  }
  if (hasRole(req, 'admin')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  return res.redirect(303, '/purchase');
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
