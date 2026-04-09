'use strict';

const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const { sanitizeString, isValidEmail, isValidPhone, validateBookingDate, isValidTime } = require('../utils/validation');
const { generateToken, verifyToken } = require('../utils/tokens');
const { saveBooking, getBookingById, updateBookingStatus } = require('../services/bookingStore');
const {
  sendBookingReceived,
  sendOwnerNotification,
  sendBookingConfirmed,
  sendBookingDeclined,
} = require('../services/mailer');
const config = require('../../config.json');

const router = express.Router();

// Rate limiting for the booking POST endpoint
const bookingLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many booking requests. Please try again later.' },
});

// POST /api/booking — submit a new booking
router.post('/', bookingLimiter, async (req, res) => {
  const {
    firstName: rawFirstName,
    lastName: rawLastName,
    phone: rawPhone,
    email: rawEmail,
    service: rawService,
    preferredDate: rawDate,
    preferredTime: rawTime,
    message: rawMessage,
  } = req.body || {};

  // Sanitize inputs
  const firstName = sanitizeString(rawFirstName);
  const lastName = sanitizeString(rawLastName);
  const phone = sanitizeString(rawPhone);
  const email = sanitizeString(rawEmail);
  const service = sanitizeString(rawService);
  const preferredDate = sanitizeString(rawDate);
  const preferredTime = sanitizeString(rawTime);
  const message = sanitizeString(rawMessage || '');

  // Server-side validation
  const errors = [];
  if (!firstName) errors.push('First name is required.');
  if (!lastName) errors.push('Last name is required.');
  if (!phone || !isValidPhone(phone)) errors.push('Valid phone number is required.');
  if (!email || !isValidEmail(email)) errors.push('Valid email address is required.');

  const allowedServices = config.booking.availableServices;
  if (!service || !allowedServices.includes(service)) {
    errors.push(`Service must be one of: ${allowedServices.join(', ')}.`);
  }

  const dateError = validateBookingDate(
    preferredDate,
    config.booking.minNoticeDays,
    config.booking.maxAdvanceBookingDays
  );
  if (dateError) errors.push(dateError);

  if (!preferredTime || !isValidTime(preferredTime)) {
    errors.push('Valid preferred time (HH:MM) is required.');
  }

  if (errors.length > 0) {
    return res.status(422).json({ errors });
  }

  // Generate unique booking ID
  const id = crypto.randomUUID();

  const booking = {
    id,
    firstName,
    lastName,
    phone,
    email,
    service,
    preferredDate,
    preferredTime,
    message,
    status: 'pending',
    createdAt: Date.now(),
  };

  // Persist booking
  saveBooking(booking);

  // Build confirm/decline URLs with signed tokens
  const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');
  const confirmToken = generateToken(id, 'confirm');
  const declineToken = generateToken(id, 'decline');
  const confirmUrl = `${BASE_URL}/api/booking/${id}/confirm?token=${encodeURIComponent(confirmToken)}`;
  const declineUrl = `${BASE_URL}/api/booking/${id}/decline?token=${encodeURIComponent(declineToken)}`;

  // Send emails (non-blocking: respond to client immediately)
  res.status(202).json({
    message: 'Booking received. We will be in touch shortly to confirm.',
  });

  try {
    await Promise.all([
      sendBookingReceived(booking),
      sendOwnerNotification(booking, confirmUrl, declineUrl),
    ]);
  } catch (err) {
    console.error('[Booking] Email send error:', err.message);
  }
});

// GET /api/booking/:id/confirm — owner confirms the booking
router.get('/:id/confirm', async (req, res) => {
  try {
    const token = req.query.token;
    const { bookingId, action } = verifyToken(token);

    if (bookingId !== req.params.id || action !== 'confirm') {
      return res.status(400).send(htmlResponse('Error', 'Invalid or mismatched action token.'));
    }

    const booking = getBookingById(bookingId);
    if (!booking) {
      return res.status(404).send(htmlResponse('Not Found', 'Booking not found.'));
    }
    if (booking.status !== 'pending') {
      return res
        .status(409)
        .send(htmlResponse('Already Processed', `This booking has already been ${booking.status}.`));
    }

    updateBookingStatus(bookingId, 'confirmed');
    await sendBookingConfirmed(booking);

    return res.send(
      htmlResponse('Confirmed', `Booking for ${booking.firstName} ${booking.lastName} has been confirmed. A confirmation email has been sent to the customer.`)
    );
  } catch (err) {
    console.error('[Confirm]', err.message);
    return res.status(400).send(htmlResponse('Error', err.message));
  }
});

// GET /api/booking/:id/decline — owner declines the booking
router.get('/:id/decline', async (req, res) => {
  try {
    const token = req.query.token;
    const { bookingId, action } = verifyToken(token);

    if (bookingId !== req.params.id || action !== 'decline') {
      return res.status(400).send(htmlResponse('Error', 'Invalid or mismatched action token.'));
    }

    const booking = getBookingById(bookingId);
    if (!booking) {
      return res.status(404).send(htmlResponse('Not Found', 'Booking not found.'));
    }
    if (booking.status !== 'pending') {
      return res
        .status(409)
        .send(htmlResponse('Already Processed', `This booking has already been ${booking.status}.`));
    }

    updateBookingStatus(bookingId, 'declined');
    await sendBookingDeclined(booking);

    return res.send(
      htmlResponse('Declined', `Booking for ${booking.firstName} ${booking.lastName} has been declined. The customer has been notified.`)
    );
  } catch (err) {
    console.error('[Decline]', err.message);
    return res.status(400).send(htmlResponse('Error', err.message));
  }
});

/**
 * Minimal HTML response for owner confirm/decline actions.
 */
function htmlResponse(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; max-width: 480px; margin: 80px auto; padding: 0 20px; color: #1a1a1a; }
    h1 { font-size: 1.5rem; }
    p { color: #444; }
    a { color: #c9a84c; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${message}</p>
  <p><a href="/">Back to website</a></p>
</body>
</html>`;
}

module.exports = router;
