import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  readFileSync(join(__dirname, '../../config.json'), 'utf8')
);

const router = Router();

/**
 * GET /api/config
 *
 * Returns non-secret configuration needed by the frontend:
 *  - studio info (name, address, coordinates, etc.)
 *  - social accounts
 *  - gallery column config
 *  - booking service list & date constraints
 *  - branding
 *
 * The map is displayed via a plain Google Maps embed iframe — no API key needed.
 */
router.get('/', (_req, res) => {
  const payload = {
    studio:   config.studio,
    social:   config.social,
    gallery:  config.gallery,
    booking:  config.booking,
    branding: config.branding,
  };
  // Short cache — 5 minutes; public config rarely changes
  res.set('Cache-Control', 'public, max-age=300');
  res.json(payload);
});

export default router;
