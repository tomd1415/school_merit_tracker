// middlewares/auth.js

// Middleware to require purchase access level for routes
exports.requirePurchaseAccess = (req, res, next) => {
  if (req.session.userRole === 'purchase' || req.session.userRole === 'full') {
    return next(); // User has required access level
  }
  
  // User not logged in, redirect to login page with the target URL
  const targetUrl = encodeURIComponent(req.originalUrl);
  res.redirect(303, `/enter-pin?target=${targetUrl}`);
};

// Middleware to require full access level for routes
exports.requireFullAccess = (req, res, next) => {
  if (req.session.userRole === 'full') {
    return next(); // User has required access level
  }
  
  // User not logged in, redirect to login page with the target URL
  const targetUrl = encodeURIComponent(req.originalUrl);
  res.redirect(303, `/enter-pin?target=${targetUrl}`);
};

