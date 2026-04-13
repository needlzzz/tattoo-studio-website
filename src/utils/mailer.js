import nodemailer from 'nodemailer';
import { fillTemplate } from './sanitize.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  readFileSync(join(__dirname, '../../config.json'), 'utf8')
);

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Send an email using a template key from config.json.
 *
 * @param {object} opts
 * @param {string} opts.to        - recipient address
 * @param {string} opts.subjectKey - key under config.email.subjects
 * @param {string} opts.bodyKey   - key under config.email.templates
 * @param {object} opts.values    - {placeholder} substitution values
 */
export async function sendEmail({ to, subjectKey, bodyKey, values }) {
  const studioName = config.studio.name;
  const allValues = { studioName, ...values };

  const subject = fillTemplate(config.email.subjects[subjectKey] ?? subjectKey, allValues);
  const text = fillTemplate(config.email.templates[bodyKey] ?? '', allValues);

  await getTransporter().sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    text,
  });
}
