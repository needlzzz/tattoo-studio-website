/**
 * Strip HTML tags from a string to prevent stored XSS.
 */
export function stripHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Replace {placeholder} tokens in a template string with values from a map.
 */
export function fillTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : `{${key}}`
  );
}

/**
 * Validate an email address with an RFC-compliant regex.
 */
export function isValidEmail(email) {
  const re =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(email);
}

/**
 * Validate a phone number (E.164 or common local formats).
 */
export function isValidPhone(phone) {
  // Allows +41441234567, 0441234567, (044) 123 45 67, etc.
  const re = /^\+?[\d\s\-().]{7,20}$/;
  return re.test(phone);
}
