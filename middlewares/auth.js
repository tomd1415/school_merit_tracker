// middlewares/auth.js
//
// Updated to use staff auth (username/password) with roles:
// - staff: purchase flow only
// - admin: full access

const { authEnabled } = require('../config/authConfig');

const wantsJson = (req) =>
  req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);

function hasRole(req, role) {
  const user = req.session && req.session.staffUser;
  const roles = (user && user.roles) || [];
  return user && (roles.includes(role) || roles.includes('admin'));
}

// Middleware to require purchase-level access (staff or admin)
exports.requirePurchaseAccess = (req, res, next) => {
  if (!authEnabled) return next();
  if (hasRole(req, 'staff')) return next();

  const targetUrl = encodeURIComponent(req.originalUrl);
  if (wantsJson(req)) {
    return res.status(401).json({ error: 'Login required', redirect: `/staff/login?target=${targetUrl}` });
  }
  return res.redirect(303, `/staff/login?target=${targetUrl}`);
};

// Middleware to require admin/full access
exports.requireFullAccess = (req, res, next) => {
  if (!authEnabled) return next();
  if (hasRole(req, 'admin')) return next();

  const targetUrl = encodeURIComponent(req.originalUrl);
  if (wantsJson(req)) {
    return res.status(401).json({ error: 'Admin login required', redirect: `/staff/login?target=${targetUrl}` });
  }
  return res.redirect(303, `/staff/login?target=${targetUrl}`);
};
