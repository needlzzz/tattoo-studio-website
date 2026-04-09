'use strict';

const nodemailer = require('nodemailer');
const config = require('../../config.json');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Replace {placeholder} tokens in a template string.
 */
function fillTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{${key}}`
  );
}

const FROM = `"${process.env.FROM_NAME || 'Tattoo Studio'}" <${process.env.FROM_EMAIL}>`;
const OWNER = process.env.OWNER_EMAIL;
const STUDIO = config.studio.name;

/**
 * Send "booking received" email to customer.
 */
async function sendBookingReceived(booking) {
  const subject = fillTemplate(config.email.subjects.bookingReceived, {
    studioName: STUDIO,
    firstName: booking.firstName,
    lastName: booking.lastName,
  });

  const html = `
    <p>Hi ${booking.firstName},</p>
    <p>Thank you for reaching out to <strong>${STUDIO}</strong>!</p>
    <p>We've received your booking request for a <strong>${booking.service}</strong> on <strong>${booking.preferredDate} at ${booking.preferredTime}</strong>.</p>
    <p>We'll review your request and get back to you shortly to confirm or adjust the appointment.</p>
    <p>If you have any questions in the meantime, feel free to reply to this email.</p>
    <p>Warm regards,<br>${STUDIO}</p>
  `;

  const transport = createTransport();
  await transport.sendMail({
    from: FROM,
    to: booking.email,
    subject,
    html,
  });
}

/**
 * Send notification email to studio owner with confirm/decline links.
 */
async function sendOwnerNotification(booking, confirmUrl, declineUrl) {
  const subject = fillTemplate(config.email.subjects.ownerNotification, {
    studioName: STUDIO,
    firstName: booking.firstName,
    lastName: booking.lastName,
  });

  const html = `
    <h2>New Booking Request</h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name</td><td>${booking.firstName} ${booking.lastName}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td>${booking.email}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Phone</td><td>${booking.phone}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Service</td><td>${booking.service}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Date</td><td>${booking.preferredDate}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Time</td><td>${booking.preferredTime}</td></tr>
      ${booking.message ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Message</td><td>${booking.message}</td></tr>` : ''}
    </table>
    <p style="margin-top:24px;">
      <a href="${confirmUrl}" style="background:#2e7d32;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;margin-right:12px;">Confirm Booking</a>
      <a href="${declineUrl}" style="background:#c62828;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Decline Booking</a>
    </p>
    <p><small>These links expire in ${process.env.BOOKING_TOKEN_EXPIRY_HOURS || 48} hours.</small></p>
  `;

  const transport = createTransport();
  await transport.sendMail({
    from: FROM,
    to: OWNER,
    subject,
    html,
  });
}

/**
 * Send booking confirmed email to customer.
 */
async function sendBookingConfirmed(booking) {
  const subject = fillTemplate(config.email.subjects.bookingConfirmed, {
    studioName: STUDIO,
    firstName: booking.firstName,
    lastName: booking.lastName,
  });

  const html = `
    <p>Hi ${booking.firstName},</p>
    <p>Great news! Your <strong>${booking.service}</strong> appointment at <strong>${STUDIO}</strong> has been <strong>confirmed</strong> for <strong>${booking.preferredDate} at ${booking.preferredTime}</strong>.</p>
    <p>We're looking forward to seeing you. If you need to reschedule or have any questions, please contact us at <a href="mailto:${config.studio.email}">${config.studio.email}</a>.</p>
    <p>See you soon!<br>${STUDIO}</p>
  `;

  const transport = createTransport();
  await transport.sendMail({
    from: FROM,
    to: booking.email,
    subject,
    html,
  });
}

/**
 * Send booking declined email to customer.
 */
async function sendBookingDeclined(booking) {
  const subject = fillTemplate(config.email.subjects.bookingDeclined, {
    studioName: STUDIO,
    firstName: booking.firstName,
    lastName: booking.lastName,
  });

  const html = `
    <p>Hi ${booking.firstName},</p>
    <p>Thank you for your interest in booking at <strong>${STUDIO}</strong>.</p>
    <p>Unfortunately, we're unable to accommodate your request for a <strong>${booking.service}</strong> on <strong>${booking.preferredDate} at ${booking.preferredTime}</strong> at this time.</p>
    <p>We'd love to find another time that works for you. Please feel free to <a href="${process.env.BASE_URL}/booking">submit a new booking request</a>, or contact us directly at <a href="mailto:${config.studio.email}">${config.studio.email}</a>.</p>
    <p>Warm regards,<br>${STUDIO}</p>
  `;

  const transport = createTransport();
  await transport.sendMail({
    from: FROM,
    to: booking.email,
    subject,
    html,
  });
}

module.exports = {
  sendBookingReceived,
  sendOwnerNotification,
  sendBookingConfirmed,
  sendBookingDeclined,
};
