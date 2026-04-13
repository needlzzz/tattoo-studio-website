import { Router } from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readJson, writeJson } from '../utils/jsonStore.js';
import { requireAdminToken } from '../middleware/auth.js';
import { sendEmail } from '../utils/mailer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOOKINGS_JSON = join(__dirname, '../../data/bookings.json');

const router = Router();

// All admin routes require the Bearer token
router.use(requireAdminToken);

// ── GET /api/admin/bookings ────────────────────────────────────────────────
// Returns all bookings, sorted newest first.
// Optional query param: ?status=pending|confirmed|declined
router.get('/bookings', async (req, res) => {
  try {
    const all = await readJson(BOOKINGS_JSON, []);
    const { status } = req.query;
    const filtered = status
      ? all.filter((b) => b.status === status)
      : all;

    // Newest first; strip internal tokens from the response
    const safe = filtered
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(({ confirmToken: _c, declineToken: _d, ...rest }) => rest);

    res.json(safe);
  } catch (err) {
    console.error('Admin bookings list error:', err);
    res.status(500).json({ error: 'Failed to read bookings' });
  }
});

// ── POST /api/admin/bookings/:id/action ───────────────────────────────────
// Body: { "action": "confirm" | "decline" }
router.post('/bookings/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body ?? {};

  if (!['confirm', 'decline'].includes(action)) {
    return res.status(400).json({ error: 'action must be "confirm" or "decline"' });
  }

  try {
    const bookings = await readJson(BOOKINGS_JSON, []);
    const idx = bookings.findIndex((b) => b.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[idx];
    if (booking.status !== 'pending') {
      return res.status(409).json({
        error: `Booking is already ${booking.status}`,
        status: booking.status,
      });
    }

    booking.status = action === 'confirm' ? 'confirmed' : 'declined';
    bookings[idx] = booking;
    await writeJson(BOOKINGS_JSON, bookings);

    const templateValues = {
      firstName:     booking.firstName,
      lastName:      booking.lastName,
      service:       booking.service,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
    };

    try {
      if (action === 'confirm') {
        await sendEmail({
          to:         booking.email,
          subjectKey: 'bookingConfirmed',
          bodyKey:    'bookingConfirmedCustomer',
          values:     templateValues,
        });
      } else {
        await sendEmail({
          to:         booking.email,
          subjectKey: 'bookingDeclined',
          bodyKey:    'bookingDeclinedCustomer',
          values:     templateValues,
        });
      }
    } catch (emailErr) {
      // Don't fail the HTTP response — log the email error
      console.error('Admin action email failed:', emailErr.message);
    }

    res.json({ id, status: booking.status });
  } catch (err) {
    console.error('Admin action error:', err);
    res.status(500).json({ error: 'Action failed' });
  }
});

export default router;
