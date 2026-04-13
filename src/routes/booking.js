import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { readJson, writeJson } from '../utils/jsonStore.js';
import { signToken, verifyToken } from '../utils/tokens.js';
import { stripHtml, isValidEmail, isValidPhone } from '../utils/sanitize.js';
import { sendEmail } from '../utils/mailer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const BOOKINGS_JSON = join(ROOT, 'data/bookings.json');
const config = JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));

const router = Router();

// ── Input validation ───────────────────────────────────────────────────────
function validateBookingBody(body) {
  const errors = {};
  const { firstName, lastName, phone, email, service, preferredDate, preferredTime } = body;

  if (!firstName || !stripHtml(firstName)) errors.firstName = 'Required';
  if (!lastName  || !stripHtml(lastName))  errors.lastName  = 'Required';
  if (!phone     || !isValidPhone(phone))   errors.phone     = 'Invalid phone number';
  if (!email     || !isValidEmail(email))   errors.email     = 'Invalid email address';

  const services = config.booking.availableServices ?? [];
  if (!service || !services.includes(service)) {
    errors.service = 'Invalid service';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + (config.booking.minNoticeDays ?? 2));
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + (config.booking.maxAdvanceBookingDays ?? 90));

  if (!preferredDate) {
    errors.preferredDate = 'Required';
  } else {
    const d = new Date(preferredDate);
    if (isNaN(d)) {
      errors.preferredDate = 'Invalid date';
    } else if (d < minDate) {
      errors.preferredDate = `Date must be at least ${config.booking.minNoticeDays ?? 2} days from today`;
    } else if (d > maxDate) {
      errors.preferredDate = `Date must be within ${config.booking.maxAdvanceBookingDays ?? 90} days`;
    }
  }

  if (!preferredTime || !stripHtml(preferredTime)) errors.preferredTime = 'Required';

  return Object.keys(errors).length ? errors : null;
}

// ── POST /api/booking ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const errors = validateBookingBody(req.body);
  if (errors) {
    return res.status(400).json({ error: 'Validation failed', fields: errors });
  }

  const {
    firstName, lastName, phone, email, service,
    preferredDate, preferredTime, message,
  } = req.body;

  // Sanitize all text inputs
  const booking = {
    id: uuidv4(),
    firstName: stripHtml(firstName),
    lastName:  stripHtml(lastName),
    phone:     stripHtml(phone),
    email:     stripHtml(email),
    service:   stripHtml(service),
    preferredDate: stripHtml(preferredDate),
    preferredTime: stripHtml(preferredTime),
    message:   message ? stripHtml(message) : '',
    status:    'pending',
    createdAt: new Date().toISOString(),
  };

  // Build HMAC tokens
  const expiresAt = new Date(
    Date.now() + (Number(process.env.BOOKING_TOKEN_EXPIRY_HOURS) || 48) * 3600 * 1000
  ).toISOString();
  const secret = process.env.HMAC_SECRET;
  const confirmToken = signToken({ bookingId: booking.id, action: 'confirm', expiresAt }, secret);
  const declineToken = signToken({ bookingId: booking.id, action: 'decline', expiresAt }, secret);

  const baseUrl = process.env.BASE_URL ?? '';
  const confirmLink = `${baseUrl}/api/booking/${booking.id}/confirm?token=${confirmToken}`;
  const declineLink = `${baseUrl}/api/booking/${booking.id}/decline?token=${declineToken}`;

  // Persist
  const bookings = await readJson(BOOKINGS_JSON, []);
  bookings.push({ ...booking, confirmToken, declineToken });
  await writeJson(BOOKINGS_JSON, bookings);

  const templateValues = {
    firstName: booking.firstName,
    lastName:  booking.lastName,
    phone:     booking.phone,
    email:     booking.email,
    service:   booking.service,
    preferredDate: booking.preferredDate,
    preferredTime: booking.preferredTime,
    message:   booking.message,
    confirmLink,
    declineLink,
  };

  // Fire emails; don't fail the HTTP response if email fails
  try {
    await sendEmail({
      to: booking.email,
      subjectKey: 'bookingReceived',
      bodyKey: 'bookingReceivedCustomer',
      values: templateValues,
    });
  } catch (err) {
    console.error('Customer email failed:', err.message);
  }
  try {
    await sendEmail({
      to: process.env.OWNER_EMAIL,
      subjectKey: 'ownerNotification',
      bodyKey: 'ownerNotification',
      values: templateValues,
    });
  } catch (err) {
    console.error('Owner email failed:', err.message);
  }

  res.status(201).json({ bookingId: booking.id });
});

// ── Shared confirm/decline handler ────────────────────────────────────────
async function handleAction(req, res, expectedAction) {
  const { id } = req.params;
  const { token } = req.query;

  let payload;
  try {
    payload = verifyToken(token, process.env.HMAC_SECRET);
  } catch {
    return res.status(403).send(actionPage('Invalid or missing token', 'error'));
  }

  if (payload.bookingId !== id || payload.action !== expectedAction) {
    return res.status(403).send(actionPage('Invalid token', 'error'));
  }

  if (new Date(payload.expiresAt) < new Date()) {
    return res.status(410).send(actionPage('This link has expired.', 'warning'));
  }

  const bookings = await readJson(BOOKINGS_JSON, []);
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx === -1) {
    return res.status(404).send(actionPage('Booking not found.', 'error'));
  }

  const booking = bookings[idx];
  if (booking.status !== 'pending') {
    const past = booking.status === 'confirmed' ? 'confirmed' : 'declined';
    return res
      .status(409)
      .send(actionPage(`This booking has already been ${past}.`, 'info'));
  }

  booking.status = expectedAction === 'confirm' ? 'confirmed' : 'declined';
  bookings[idx] = booking;
  await writeJson(BOOKINGS_JSON, bookings);

  const templateValues = {
    firstName: booking.firstName,
    lastName:  booking.lastName,
    service:   booking.service,
    preferredDate: booking.preferredDate,
    preferredTime: booking.preferredTime,
  };

  try {
    if (expectedAction === 'confirm') {
      await sendEmail({
        to: booking.email,
        subjectKey: 'bookingConfirmed',
        bodyKey: 'bookingConfirmedCustomer',
        values: templateValues,
      });
    } else {
      await sendEmail({
        to: booking.email,
        subjectKey: 'bookingDeclined',
        bodyKey: 'bookingDeclinedCustomer',
        values: templateValues,
      });
    }
  } catch (err) {
    console.error('Action email failed:', err.message);
  }

  const msg =
    expectedAction === 'confirm'
      ? 'Booking confirmed. A confirmation email has been sent to the customer.'
      : 'Booking declined. The customer has been notified.';
  res.send(actionPage(msg, 'success'));
}

router.get('/:id/confirm', (req, res) => handleAction(req, res, 'confirm'));
router.get('/:id/decline', (req, res) => handleAction(req, res, 'decline'));

// ── Minimal HTML response page ─────────────────────────────────────────────
function actionPage(message, type) {
  const colors = {
    success: '#2d6a4f',
    info:    '#1d3557',
    warning: '#e76f51',
    error:   '#b5333a',
  };
  const bg = colors[type] ?? '#333';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Booking</title>
  <style>
    body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
    .card{background:#fff;border-radius:8px;padding:2.5rem 3rem;max-width:480px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.1)}
    .badge{display:inline-block;padding:.35em 1em;border-radius:999px;background:${bg};color:#fff;font-size:.85rem;margin-bottom:1rem;text-transform:uppercase;letter-spacing:.08em}
    p{color:#333;font-size:1.05rem;line-height:1.6}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${type}</div>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

export default router;
