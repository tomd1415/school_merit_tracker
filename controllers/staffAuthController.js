// controllers/staffAuthController.js
//
// Scaffolded staff authentication and admin user management.
// This is guarded by the AUTH_ENABLED flag so it will not affect the
// existing PIN-based login until you explicitly turn it on.

const path = require('path');
const pool = require('../db');
const { hashPassword, verifyPassword } = require('../services/passwordService');
const { authEnabled } = require('../config/authConfig');

const wantsJson = (req) =>
  req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);

function featureDisabled(res) {
  return res
    .status(503)
    .json({ error: 'Staff authentication is not enabled. Set AUTH_ENABLED=true to enable it.' });
}

function ensureSessionUser(req, res) {
  if (!req.session || !req.session.staffUser) {
    res.status(401).json({ error: 'Login required' });
    return null;
  }
  return req.session.staffUser;
}

function ensureAdmin(req, res) {
  const user = ensureSessionUser(req, res);
  if (!user) return null;
  const roles = user.roles || [];
  if (!roles.includes('admin')) {
    res.status(403).json({ error: 'Admin role required' });
    return null;
  }
  return user;
}

exports.showLoginPage = (req, res) => {
  if (!authEnabled) {
    return res
      .status(503)
      .send('Staff authentication is not enabled. Set AUTH_ENABLED=true to enable it.');
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'staff-login.html'));
};

exports.showAdminPage = (req, res) => {
  if (!authEnabled) {
    return res
      .status(503)
      .send('Staff authentication is not enabled. Set AUTH_ENABLED=true to enable it.');
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'users.html'));
};

exports.handleLogin = async (req, res) => {
  if (!authEnabled) return featureDisabled(res);

  const { username, password, target } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const userResult = await pool.query(
      `
        SELECT staff_user_id, username, password_hash, active
        FROM staff_users
        WHERE LOWER(username) = LOWER($1)
        LIMIT 1;
      `,
      [username]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = userResult.rows[0];
    if (!user.active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const roleResult = await pool.query(
      `
        SELECT r.role_name
          FROM staff_user_roles ur
          JOIN staff_roles r ON r.role_id = ur.role_id
         WHERE ur.staff_user_id = $1
      `,
      [user.staff_user_id]
    );
    const roles = roleResult.rows.map(r => r.role_name);

    req.session.staffUser = {
      id: user.staff_user_id,
      username: user.username,
      roles,
    };

    await pool.query(
      `UPDATE staff_users SET last_login_at = NOW() WHERE staff_user_id = $1`,
      [user.staff_user_id]
    );

    const redirect = target
      ? target
      : roles.includes('admin')
        ? '/'
        : '/purchase';

    return res.json({ success: true, user: { username: user.username, roles }, redirect });
  } catch (err) {
    console.error('Error during staff login:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

exports.handleLogout = (req, res) => {
  if (!authEnabled) return featureDisabled(res);

  if (req.session) {
    delete req.session.staffUser;
  }
  // Accept both JSON and browser navigations
  if (wantsJson(req)) {
    return res.json({ success: true });
  }
  return res.redirect(303, '/staff/login');
};

exports.listUsers = async (req, res) => {
  if (!authEnabled) return featureDisabled(res);
  if (!ensureAdmin(req, res)) return;

  try {
    const result = await pool.query(
      `
        SELECT 
          u.staff_user_id,
          u.username,
          u.active,
          u.created_at,
          u.last_login_at,
          COALESCE(
            ARRAY_AGG(r.role_name ORDER BY r.role_name)
            FILTER (WHERE r.role_name IS NOT NULL),
            '{}'
          ) AS roles
        FROM staff_users u
        LEFT JOIN staff_user_roles ur ON ur.staff_user_id = u.staff_user_id
        LEFT JOIN staff_roles r ON r.role_id = ur.role_id
        GROUP BY u.staff_user_id
        ORDER BY LOWER(u.username);
      `
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Error listing staff users:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
};

async function ensureRolesExist(roles = []) {
  if (!roles || roles.length === 0) return;
  const unique = Array.from(new Set(roles));
  for (const role of unique) {
    await pool.query(
      `INSERT INTO staff_roles (role_name, description) VALUES ($1, '') ON CONFLICT (role_name) DO NOTHING`,
      [role]
    );
  }
}

exports.createUser = async (req, res) => {
  if (!authEnabled) return featureDisabled(res);

  const { username, password, roles = ['staff'], active = true } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const countResult = await pool.query(`SELECT COUNT(*) AS count FROM staff_users;`);
    const isFirstUser = Number(countResult.rows[0].count || 0) === 0;

    if (!isFirstUser && !ensureAdmin(req, res)) return;

    const exists = await pool.query(
      `SELECT 1 FROM staff_users WHERE LOWER(username) = LOWER($1)`,
      [username]
    );
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    let rolesToApply = roles && roles.length ? roles : ['staff'];
    if (isFirstUser && !rolesToApply.includes('admin')) {
      rolesToApply = [...rolesToApply, 'admin'];
    }

    await ensureRolesExist(rolesToApply);
    const passwordHash = hashPassword(password);

    const insertUser = await pool.query(
      `
        INSERT INTO staff_users (username, password_hash, active, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING staff_user_id;
      `,
      [username, passwordHash, active]
    );

    const newUserId = insertUser.rows[0].staff_user_id;

    if (rolesToApply && rolesToApply.length > 0) {
      for (const role of new Set(rolesToApply)) {
        await pool.query(
          `
            INSERT INTO staff_user_roles (staff_user_id, role_id)
            SELECT $1, role_id FROM staff_roles WHERE role_name = $2
            ON CONFLICT DO NOTHING;
          `,
          [newUserId, role]
        );
      }
    }

    return res.status(201).json({
      success: true,
      user: { id: newUserId, username, roles: rolesToApply, active },
    });
  } catch (err) {
    console.error('Error creating staff user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
};
