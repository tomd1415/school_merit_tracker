// services/passwordService.js
//
// Lightweight password hashing/verification using Node's built-in scrypt.
// Keeps us dependency-free while we scaffold the staff auth feature.

const crypto = require('crypto');

const ALGO_TAG = 'scrypt';
const KEY_LENGTH = 64;

function hashPassword(plainText) {
  if (!plainText) throw new Error('Password is required');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plainText, salt, KEY_LENGTH).toString('hex');
  // Stored format: algo:salt:hash
  return `${ALGO_TAG}:${salt}:${hash}`;
}

function verifyPassword(plainText, stored) {
  if (!plainText || !stored) return false;
  const parts = stored.split(':');
  if (parts.length !== 3) return false;

  const [algo, salt, storedHash] = parts;
  if (algo !== ALGO_TAG || !salt || !storedHash) return false;

  const derived = crypto.scryptSync(plainText, salt, KEY_LENGTH).toString('hex');
  // Use constant-time comparison to avoid timing attacks
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
