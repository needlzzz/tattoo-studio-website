'use strict';

/**
 * Sanitize a string: trim whitespace and strip HTML tags / dangerous characters.
 * This is a server-side guard; client-side validation runs first.
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[&'"]/g, (c) => {        // encode special chars
      return { '&': '&amp;', "'": '&#x27;', '"': '&quot;' }[c];
    })
    .slice(0, 2000);                    // hard cap
}

/**
 * Validate an email address format.
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate a phone number: digits, spaces, +, -, (, ) allowed; 7–20 chars.
 */
function isValidPhone(phone) {
  const re = /^\+?[\d\s\-().]{7,20}$/;
  return re.test(phone);
}

/**
 * Validate a date string (YYYY-MM-DD) against booking window constraints.
 * Returns null on success or an error string on failure.
 */
function validateBookingDate(dateStr, minNoticeDays, maxAdvanceBookingDays) {
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(dateStr)) return 'Invalid date format.';

  const chosen = new Date(dateStr + 'T00:00:00');
  if (isNaN(chosen.getTime())) return 'Invalid date.';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + minNoticeDays);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxAdvanceBookingDays);

  if (chosen < minDate) {
    return `Date must be at least ${minNoticeDays} day(s) from today.`;
  }
  if (chosen > maxDate) {
    return `Date must be within ${maxAdvanceBookingDays} days from today.`;
  }
  return null;
}

/**
 * Validate a time string (HH:MM).
 */
function isValidTime(timeStr) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr);
}

module.exports = { sanitizeString, isValidEmail, isValidPhone, validateBookingDate, isValidTime };
