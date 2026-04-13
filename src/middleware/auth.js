/**
 * Admin authentication middleware.
 * Expects: Authorization: Bearer <ADMIN_UPLOAD_PASSWORD>
 */
export function requireAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const expected = process.env.ADMIN_UPLOAD_PASSWORD;
  if (!expected || token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
