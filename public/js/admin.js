// ── State ──────────────────────────────────────────
let adminPassword  = sessionStorage.getItem('admin_pw') ?? '';
let allBookings    = [];
let currentFilter  = 'all';

// ── Login ──────────────────────────────────────────
const loginScreen   = document.getElementById('login-screen');
const app           = document.getElementById('app');
const loginBtn      = document.getElementById('login-btn');
const loginError    = document.getElementById('login-error');
const passwordInput = document.getElementById('password-input');

passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

loginBtn.addEventListener('click', async () => {
  const pw = passwordInput.value.trim();
  if (!pw) return;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Checking…';
  loginError.classList.remove('show');

  const ok = await testPassword(pw);
  if (ok) {
    adminPassword = pw;
    sessionStorage.setItem('admin_pw', pw);
    showApp();
  } else {
    loginError.classList.add('show');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
    passwordInput.focus();
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('admin_pw');
  adminPassword = '';
  app.classList.remove('visible');
  loginScreen.style.display = 'flex';
  passwordInput.value = '';
});

async function testPassword(pw) {
  try {
    const res = await fetch('/api/admin/bookings?status=pending', {
      headers: { Authorization: `Bearer ${pw}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function showApp() {
  loginScreen.style.display = 'none';
  app.classList.add('visible');
  loadBookings();
}

// Auto-login if password is cached in sessionStorage
if (adminPassword) {
  testPassword(adminPassword).then((ok) => {
    if (ok) showApp();
    else sessionStorage.removeItem('admin_pw');
  });
}

// ── Data loading ────────────────────────────────────
async function loadBookings() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('bookings-table').style.display = 'none';
  document.getElementById('empty-state').style.display = 'none';

  try {
    const res = await fetch('/api/admin/bookings', {
      headers: { Authorization: `Bearer ${adminPassword}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allBookings = await res.json();

    updateCounts();
    renderTable();
    document.getElementById('last-updated').textContent =
      'Updated ' + new Date().toLocaleTimeString();
  } catch (err) {
    toast('Failed to load bookings: ' + err.message, 'err');
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

document.getElementById('refresh-btn').addEventListener('click', loadBookings);

// ── Filters ─────────────────────────────────────────
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTable();
  });
});

function updateCounts() {
  const counts = { all: 0, pending: 0, confirmed: 0, declined: 0 };
  allBookings.forEach((b) => {
    counts.all++;
    if (counts[b.status] !== undefined) counts[b.status]++;
  });
  Object.entries(counts).forEach(([key, n]) => {
    const el = document.getElementById(`count-${key}`);
    if (el) el.textContent = n;
  });
}

// ── Render table ────────────────────────────────────
function renderTable() {
  const filtered = currentFilter === 'all'
    ? allBookings
    : allBookings.filter((b) => b.status === currentFilter);

  const tbody = document.getElementById('bookings-body');
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    document.getElementById('bookings-table').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    return;
  }

  document.getElementById('bookings-table').style.display = '';
  document.getElementById('empty-state').style.display = 'none';

  filtered.forEach((b) => {
    const tr = document.createElement('tr');
    tr.dataset.id = b.id;
    tr.innerHTML = `
      <td>${badge(b.status)}</td>
      <td><strong>${esc(b.firstName)} ${esc(b.lastName)}</strong></td>
      <td>${esc(b.service)}</td>
      <td class="muted">${esc(b.preferredDate)}</td>
      <td class="muted">${esc(b.preferredTime)}</td>
      <td class="muted">
        <div>${esc(b.email)}</div>
        <div>${esc(b.phone)}</div>
      </td>
      <td class="message">${esc(b.message || '—')}</td>
      <td class="muted">${formatDate(b.createdAt)}</td>
      <td>
        ${b.status === 'pending' ? `
          <div class="actions">
            <button class="btn btn-confirm" data-action="confirm" data-id="${esc(b.id)}">✓ Confirm</button>
            <button class="btn btn-decline" data-action="decline" data-id="${esc(b.id)}">✗ Decline</button>
          </div>
        ` : '<span class="muted">—</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Wire action buttons
  tbody.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleAction(btn.dataset.id, btn.dataset.action);
    });
  });
}

// ── Actions ─────────────────────────────────────────
async function handleAction(id, action) {
  const row     = document.querySelector(`tr[data-id="${id}"]`);
  const allBtns = row?.querySelectorAll('.btn');
  allBtns?.forEach((b) => { b.disabled = true; });

  try {
    const res = await fetch(`/api/admin/bookings/${encodeURIComponent(id)}/action`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${adminPassword}`,
      },
      body: JSON.stringify({ action }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      const booking = allBookings.find((b) => b.id === id);
      if (booking) booking.status = data.status;
      updateCounts();
      renderTable();
      toast(
        action === 'confirm'
          ? 'Booking confirmed — customer notified.'
          : 'Booking declined — customer notified.',
        'ok'
      );
    } else {
      allBtns?.forEach((b) => { b.disabled = false; });
      toast(data.error || 'Action failed.', 'err');
    }
  } catch {
    allBtns?.forEach((b) => { b.disabled = false; });
    toast('Network error.', 'err');
  }
}

// ── Helpers ──────────────────────────────────────────
function badge(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

let toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 4000);
}
