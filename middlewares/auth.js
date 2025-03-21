// middlewares/auth.js

// Purchase Access: userRole can be 'purchase' or 'full'
exports.requirePurchaseAccess = (req, res, next) => {
  if (!req.session.userRole) {
    return res.redirect('/enter-pin');
  }
  if (req.session.userRole === 'purchase' || req.session.userRole === 'full') {
    return next();
  }
  // If they have some other role, or none, block
  return res.redirect('/enter-pin');
};

// Full Access: userRole must be 'full'
exports.requireFullAccess = (req, res, next) => {
  if (!req.session.userRole) {
    return res.redirect('/enter-pin');
  }
  if (req.session.userRole === 'full') {
    return next();
  }
  return res.status(403).send('You do not have permission to access this page.');
};

