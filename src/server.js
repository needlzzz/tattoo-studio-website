import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import galleryRouter  from './routes/gallery.js';
import bookingRouter  from './routes/booking.js';
import configRouter   from './routes/config.js';
import adminRouter    from './routes/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Ensure required directories and empty data files exist ─────────────────
for (const dir of ['public/uploads', 'data']) {
  const p = join(ROOT, dir);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}
for (const file of ['data/gallery.json', 'data/bookings.json']) {
  const p = join(ROOT, file);
  if (!existsSync(p)) writeFileSync(p, '[]', 'utf8');
}

// ── App setup ──────────────────────────────────────────────────────────────
const app = express();

// Trust proxy header if running behind a reverse proxy (nginx, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ── Security headers ───────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
        imgSrc:      ["'self'", 'data:'],
        connectSrc:  ["'self'"],
        // Allow Google Maps embed iframes (no API key required)
        frameSrc:    ['https://www.google.com'],
        objectSrc:   ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// ── Rate limiters ─────────────────────────────────────────────────────────
const windowMs = (Number(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000;

const bookingLimiter = rateLimit({
  windowMs,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const uploadLimiter = rateLimit({
  windowMs,
  max: Number(process.env.UPLOAD_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests, please try again later.' },
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/gallery/upload', uploadLimiter);
app.use('/api/booking',        bookingLimiter);

app.use('/api/gallery',  galleryRouter);
app.use('/api/booking',  bookingRouter);
app.use('/api/config',   configRouter);
app.use('/api/admin',    adminRouter);

// ── Static files ───────────────────────────────────────────────────────────
app.use(express.static(join(ROOT, 'public')));

// ── Admin dashboard ────────────────────────────────────────────────────────
app.get('/admin', (_req, res) => {
  res.sendFile(join(ROOT, 'public/admin.html'));
});

// ── SPA fallback — serve index.html for any other unmatched route ──────────
app.get('*', (_req, res) => {
  res.sendFile(join(ROOT, 'public/index.html'));
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Ink & Soul server running on http://localhost:${PORT}`);
});
