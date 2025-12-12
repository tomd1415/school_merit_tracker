// config/authConfig.js
//
// Central place for feature flags related to staff authentication.
// Default is ON. Set AUTH_ENABLED=false only if you intentionally want to
// disable username/password staff auth (not recommended).
const authEnabled = String(process.env.AUTH_ENABLED ?? 'true').toLowerCase() === 'true';

module.exports = {
  authEnabled,
};
