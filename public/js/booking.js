import { loadConfig, applyBranding, populateFooter, initNavToggle, setActiveNav } from './common.js';

async function init() {
  let cfg;
  try {
    cfg = await loadConfig();
    applyBranding(cfg.branding);
    populateFooter(cfg.studio, cfg.social);
    document.title = `Book an Appointment — ${cfg.studio.name}`;
    populateForm(cfg);
  } catch (err) {
    console.error('Config load error:', err);
  }

  initNavToggle();
  setActiveNav();
  initForm(cfg);
}

function populateForm(cfg) {
  // Populate service dropdown
  const serviceSelect = document.getElementById('field-service');
  if (serviceSelect && cfg?.booking?.availableServices) {
    cfg.booking.availableServices.forEach((svc) => {
      const opt = document.createElement('option');
      opt.value = svc;
      opt.textContent = svc;
      serviceSelect.appendChild(opt);
    });
  }

  // Set date constraints
  const dateInput = document.getElementById('field-date');
  if (dateInput && cfg?.booking) {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + (cfg.booking.minNoticeDays || 2));
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + (cfg.booking.maxAdvanceBookingDays || 90));
    dateInput.min = formatDate(minDate);
    dateInput.max = formatDate(maxDate);
  }
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function initForm(cfg) {
  const form = document.getElementById('booking-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    hideAlert();

    if (!validateForm(cfg)) return;

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Sending…';

    const payload = {
      firstName: getVal('field-first-name'),
      lastName: getVal('field-last-name'),
      phone: getVal('field-phone'),
      email: getVal('field-email'),
      service: getVal('field-service'),
      preferredDate: getVal('field-date'),
      preferredTime: getVal('field-time'),
      message: getVal('field-message'),
    };

    try {
      const resp = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

      if (resp.ok || resp.status === 202) {
        showAlert('success', data.message || 'Booking received! We'll be in touch shortly.');
        form.reset();
      } else if (resp.status === 422 && data.errors) {
        showAlert('error', data.errors.join(' '));
      } else if (resp.status === 429) {
        showAlert('error', 'Too many requests. Please try again later.');
      } else {
        showAlert('error', data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('[Booking form]', err);
      showAlert('error', 'Network error. Please check your connection and try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Booking Request';
    }
  });
}

function validateForm(cfg) {
  let valid = true;

  const firstName = getVal('field-first-name');
  if (!firstName.trim()) {
    setError('field-first-name', 'First name is required.');
    valid = false;
  }

  const lastName = getVal('field-last-name');
  if (!lastName.trim()) {
    setError('field-last-name', 'Last name is required.');
    valid = false;
  }

  const phone = getVal('field-phone');
  if (!phone.trim() || !/^\+?[\d\s\-().]{7,20}$/.test(phone)) {
    setError('field-phone', 'Please enter a valid phone number.');
    valid = false;
  }

  const email = getVal('field-email');
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setError('field-email', 'Please enter a valid email address.');
    valid = false;
  }

  const service = getVal('field-service');
  if (!service) {
    setError('field-service', 'Please select a service.');
    valid = false;
  }

  const date = getVal('field-date');
  if (!date) {
    setError('field-date', 'Please select a preferred date.');
    valid = false;
  } else if (cfg?.booking) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = new Date(date + 'T00:00:00');
    const min = new Date(today);
    min.setDate(min.getDate() + cfg.booking.minNoticeDays);
    const max = new Date(today);
    max.setDate(max.getDate() + cfg.booking.maxAdvanceBookingDays);
    if (chosen < min) {
      setError('field-date', `Date must be at least ${cfg.booking.minNoticeDays} days from today.`);
      valid = false;
    } else if (chosen > max) {
      setError('field-date', `Date must be within ${cfg.booking.maxAdvanceBookingDays} days from today.`);
      valid = false;
    }
  }

  const time = getVal('field-time');
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    setError('field-time', 'Please enter a preferred time (HH:MM).');
    valid = false;
  }

  return valid;
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setError(id, msg) {
  const input = document.getElementById(id);
  if (input) input.classList.add('invalid');
  const errEl = document.getElementById(`${id}-error`);
  if (errEl) {
    errEl.textContent = msg;
    errEl.classList.add('visible');
  }
}

function clearErrors() {
  document.querySelectorAll('.form__input, .form__select, .form__textarea').forEach((el) => {
    el.classList.remove('invalid');
  });
  document.querySelectorAll('.form__error-msg').forEach((el) => {
    el.textContent = '';
    el.classList.remove('visible');
  });
}

function showAlert(type, message) {
  const el = document.getElementById('form-alert');
  if (!el) return;
  el.textContent = message;
  el.className = `form-alert form-alert--${type} visible`;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  const el = document.getElementById('form-alert');
  if (el) el.className = 'form-alert';
}

init();
