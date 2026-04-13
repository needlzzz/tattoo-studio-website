import crypto from 'crypto';

const ALGORITHM = 'sha256';

/**
 * Sign a payload object and return a "<base64url-payload>.<base64url-hmac>" token.
 */
export function signToken(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto
    .createHmac(ALGORITHM, secret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${hmac}`;
}

/**
 * Verify a token.
 * Returns the decoded payload on success.
 * Throws an Error with a descriptive message on failure.
 */
export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing token');
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('Malformed token');
  }
  const [encoded, providedHmac] = parts;
  const expectedHmac = crypto
    .createHmac(ALGORITHM, secret)
    .update(encoded)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(expectedHmac);
  const provided = Buffer.from(providedHmac);
  if (
    expected.length !== provided.length ||
    !crypto.timingSafeEqual(expected, provided)
  ) {
    throw new Error('Invalid token signature');
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Malformed token payload');
  }
  return payload;
}
