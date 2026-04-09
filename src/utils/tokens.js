'use strict';

const crypto = require('crypto');

const SECRET = process.env.HMAC_SECRET;
if (!SECRET) {
  throw new Error('HMAC_SECRET environment variable is required.');
}

const EXPIRY_HOURS = parseInt(process.env.BOOKING_TOKEN_EXPIRY_HOURS || '48', 10);

/**
 * Generate a signed token for a booking action.
 * Format: <bookingId>.<action>.<expiresAt>.<signature>
 */
function generateToken(bookingId, action) {
  const expiresAt = Date.now() + EXPIRY_HOURS * 60 * 60 * 1000;
  const payload = `${bookingId}.${action}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/**
 * Verify a signed token.
 * Returns { bookingId, action } on success, or throws an error.
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token format.');
  }

  const parts = token.split('.');
  if (parts.length !== 4) {
    throw new Error('Invalid token structure.');
  }

  const [bookingId, action, expiresAtStr, sig] = parts;
  const payload = `${bookingId}.${action}.${expiresAtStr}`;

  const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(sig, 'hex');
  const expectedBuffer = Buffer.from(expectedSig, 'hex');

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid token signature.');
  }

  const expiresAt = parseInt(expiresAtStr, 10);
  if (Date.now() > expiresAt) {
    throw new Error('Token has expired.');
  }

  if (!['confirm', 'decline'].includes(action)) {
    throw new Error('Invalid token action.');
  }

  return { bookingId, action };
}

module.exports = { generateToken, verifyToken };
