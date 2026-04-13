import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { readJson, writeJson } from '../utils/jsonStore.js';
import { requireAdminToken } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const UPLOADS_DIR = join(ROOT, 'public/uploads');
const GALLERY_JSON = join(ROOT, 'data/gallery.json');
const config = JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));

const router = Router();

// ── Multer: memory storage so sharp can process before saving ──────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (Number(process.env.MAX_UPLOAD_SIZE_MB) || 10) * 1024 * 1024,
  },
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(Object.assign(new Error('Unsupported file type'), { status: 415 }));
    }
    cb(null, true);
  },
});

// ── GET /api/gallery ───────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const entries = await readJson(GALLERY_JSON, []);
    const max = config.gallery.maxPhotosDisplayed ?? 24;
    // Most recent first
    const sorted = [...entries].sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );
    res.json(sorted.slice(0, max));
  } catch (err) {
    console.error('Gallery list error:', err);
    res.status(500).json({ error: 'Failed to read gallery' });
  }
});

// ── POST /api/gallery/upload ───────────────────────────────────────────────
router.post(
  '/upload',
  requireAdminToken,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        const status = err.status ?? (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
        return res.status(status).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const id = uuidv4();
      const filename = `${id}.jpg`;
      const thumbFilename = `${id}_thumb.jpg`;
      const fullPath = join(UPLOADS_DIR, filename);
      const thumbPath = join(UPLOADS_DIR, thumbFilename);

      // Full image: longest side ≤ 1600px, JPEG q80
      await sharp(req.file.buffer)
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(fullPath);

      // Thumbnail: longest side ≤ 400px, JPEG q70
      await sharp(req.file.buffer)
        .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toFile(thumbPath);

      const entry = {
        id,
        filename,
        thumbFilename,
        uploadedAt: new Date().toISOString(),
      };

      const entries = await readJson(GALLERY_JSON, []);
      entries.push(entry);
      await writeJson(GALLERY_JSON, entries);

      res.status(201).json(entry);
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

// ── DELETE /api/gallery/:id ────────────────────────────────────────────────
router.delete('/:id', requireAdminToken, async (req, res) => {
  const { id } = req.params;
  // Basic UUID format check
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const entries = await readJson(GALLERY_JSON, []);
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Not found' });
    }

    const [removed] = entries.splice(idx, 1);

    // Delete files (ignore errors if already missing)
    await Promise.allSettled([
      unlink(join(UPLOADS_DIR, removed.filename)),
      unlink(join(UPLOADS_DIR, removed.thumbFilename)),
    ]);

    await writeJson(GALLERY_JSON, entries);
    res.json({ deleted: id });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
