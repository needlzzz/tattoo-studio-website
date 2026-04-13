/**
 * booking.js — Appointment form validation and submission
 */

export function initBooking(config) {
  const form = document.getElementById('booking-form');
  if (!form) return;

  populateServices(config.booking?.availableServices ?? []);
  constrainDatePicker(config.booking);
  setupValidation(form);
}

// ── Populate service dropdown from config ──────────────
function populateServices(services) {
  const select = document.getElementById('field-service');
  if (!select) return;
  services.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });
}

// ── Constrain the date picker ──────────────────────────
function constrainDatePicker(bookingConfig) {
  const input = document.getElementById('field-preferred-date');
  if (!input) return;

  const min = bookingConfig?.minNoticeDays ?? 2;
  const max = bookingConfig?.maxAdvanceBookingDays ?? 90;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + min);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + max);

  input.min = toDateString(minDate);
  input.max = toDateString(maxDate);
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

// ── Client-side validation ─────────────────────────────
const VALIDATORS = {
  'field-first-name': {
    validate: (v) => v.trim().length > 0,
    message: 'First name is required.',
  },
  'field-last-name': {
    validate: (v) => v.trim().length > 0,
    message: 'Last name is required.',
  },
  'field-phone': {
    validate: (v) => /^\+?[\d\s\-().]{7,20}$/.test(v.trim()),
    message: 'Please enter a valid phone number.',
  },
  'field-email': {
    validate: (v) =>
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(v),
    message: 'Please enter a valid email address.',
  },
  'field-service': {
    validate: (v) => v !== '',
    message: 'Please select a service.',
  },
  'field-preferred-date': {
    validate: (v) => v.trim().length > 0,
    message: 'Please select a preferred date.',
  },
  'field-preferred-time': {
    validate: (v) => v.trim().length > 0,
    message: 'Please enter a preferred time.',
  },
};

function validateField(input) {
  const rule = VALIDATORS[input.id];
  if (!rule) return true;
  const valid = rule.validate(input.value);
  const fieldEl = input.closest('.field');
  if (valid) {
    fieldEl?.classList.remove('invalid');
  } else {
    fieldEl?.classList.add('invalid');
    const msgEl = fieldEl?.querySelector('.error-msg');
    if (msgEl) msgEl.textContent = rule.message;
  }
  return valid;
}

function setupValidation(form) {
  // Live validation on blur
  form.querySelectorAll('input, select, textarea').forEach((input) => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.closest('.field')?.classList.contains('invalid')) {
        validateField(input);
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate all fields
    let allValid = true;
    Object.keys(VALIDATORS).forEach((id) => {
      const el = document.getElementById(id);
      if (el && !validateField(el)) allValid = false;
    });
    if (!allValid) return;

    const status = document.getElementById('booking-status');
    const submitBtn = form.querySelector('[type="submit"]');

    submitBtn.disabled = true;
    status.className = '';
    status.style.display = 'none';

    const body = {
      firstName:     document.getElementById('field-first-name').value.trim(),
      lastName:      document.getElementById('field-last-name').value.trim(),
      phone:         document.getElementById('field-phone').value.trim(),
      email:         document.getElementById('field-email').value.trim(),
      service:       document.getElementById('field-service').value,
      preferredDate: document.getElementById('field-preferred-date').value,
      preferredTime: document.getElementById('field-preferred-time').value.trim(),
      message:       document.getElementById('field-message').value.trim(),
    };

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        form.reset();
        // Clear all invalid states
        form.querySelectorAll('.field.invalid').forEach((f) => f.classList.remove('invalid'));
        status.textContent = 'Your booking request has been sent! We\'ll be in touch shortly.';
        status.className = 'form-status success';
      } else {
        const data = await res.json().catch(() => ({}));
        const msg  = data.error || 'Something went wrong. Please try again.';
        if (data.fields) {
          // Map server errors back to field elements
          Object.entries(data.fields).forEach(([key, fieldMsg]) => {
            const camel = key; // e.g. "firstName"
            // Convert camelCase to kebab input id
            const id = 'field-' + camel.replace(/([A-Z])/g, '-$1').toLowerCase();
            const el = document.getElementById(id);
            if (el) {
              const fieldEl = el.closest('.field');
              fieldEl?.classList.add('invalid');
              const msgEl = fieldEl?.querySelector('.error-msg');
              if (msgEl) msgEl.textContent = fieldMsg;
            }
          });
        }
        status.textContent = msg;
        status.className = 'form-status error-msg';
      }
    } catch {
      status.textContent = 'Network error. Please check your connection and try again.';
      status.className = 'form-status error-msg';
    } finally {
      submitBtn.disabled = false;
    }
  });
}
