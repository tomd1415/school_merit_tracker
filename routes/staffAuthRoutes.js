// routes/staffAuthRoutes.js
//
// Staff authentication and admin user management routes.
// Mounted only when AUTH_ENABLED=true to avoid changing current behaviour.

const express = require('express');
const router = express.Router();

const staffAuthController = require('../controllers/staffAuthController');
const { requireStaffAuth, requireStaffRole, allowBootstrapOrRole } = require('../middlewares/staffAuth');

router.get('/login', staffAuthController.showLoginPage);
router.post('/login', staffAuthController.handleLogin);
router.post('/logout', staffAuthController.handleLogout);
router.get('/logout', staffAuthController.handleLogout);
router.post('/change-password', requireStaffAuth, staffAuthController.changePassword);

// Admin user management
router.get('/admin/users', allowBootstrapOrRole('admin'), staffAuthController.showAdminPage);
router.get('/api/users', requireStaffRole('admin'), staffAuthController.listUsers);
router.post('/api/users', allowBootstrapOrRole('admin'), staffAuthController.createUser);
router.patch('/api/users/:userId/password', requireStaffRole('admin'), staffAuthController.updateUserPassword);
router.patch('/api/users/:userId/active', requireStaffRole('admin'), staffAuthController.setUserActive);
router.delete('/api/users/:userId', requireStaffRole('admin'), staffAuthController.deleteUser);

module.exports = router;
