// middlewares/staffAuth.js
//
// Middleware helpers for the scaffolded staff authentication system.
// These are only used when AUTH_ENABLED=true.

const { authEnabled } = require('../config/authConfig');
const pool = require('../db');

function requireStaffAuth(req, res, next) {
  if (!authEnabled) {
    return res.status(503).json({ error: 'Staff authentication is not enabled.' });
  }
  if (req.session && req.session.staffUser) {
    return next();
  }
  return res.status(401).json({ error: 'Login required' });
}

function requireStaffRole(role) {
  return (req, res, next) => {
    if (!authEnabled) {
      return res.status(503).json({ error: 'Staff authentication is not enabled.' });
    }
    const user = req.session && req.session.staffUser;
    const roles = (user && user.roles) || [];
    if (user && (roles.includes(role) || roles.includes('admin'))) {
      return next();
    }
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

// Allow the request if no staff users exist yet (bootstrap path), otherwise
// require the specified role (or admin).
function allowBootstrapOrRole(role) {
  return async (req, res, next) => {
    if (!authEnabled) {
      return res.status(503).json({ error: 'Staff authentication is not enabled.' });
    }

    try {
      const countResult = await pool.query(`SELECT COUNT(*) AS count FROM staff_users;`);
      const isFirstUser = Number(countResult.rows[0].count || 0) === 0;
      if (isFirstUser) {
        return next();
      }
    } catch (err) {
      console.error('Error checking staff user count:', err);
      const msg = (err && err.message && err.message.includes('staff_users'))
        ? 'Run migrations/20241211_staff_auth.sql before enabling staff auth.'
        : 'Auth bootstrap check failed';
      return res.status(500).json({ error: msg });
    }

    const user = req.session && req.session.staffUser;
    const roles = (user && user.roles) || [];
    if (user && (roles.includes(role) || roles.includes('admin'))) {
      return next();
    }
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

module.exports = {
  requireStaffAuth,
  requireStaffRole,
  allowBootstrapOrRole,
};
