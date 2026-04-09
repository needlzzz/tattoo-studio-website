/**
 * Fetch and apply config from /api/config, then call the callback.
 * Applies branding CSS variables and populates footer/nav dynamically.
 */
export async function loadConfig() {
  const resp = await fetch('/api/config');
  if (!resp.ok) throw new Error('Failed to load config');
  return resp.json();
}

/**
 * Apply branding values from config to CSS custom properties.
 */
export function applyBranding(branding) {
  const root = document.documentElement;
  if (branding.primaryColor) root.style.setProperty('--color-primary', branding.primaryColor);
  if (branding.accentColor) {
    root.style.setProperty('--color-accent', branding.accentColor);
  }
  if (branding.fontHeading) root.style.setProperty('--font-heading', `'${branding.fontHeading}', Georgia, serif`);
  if (branding.fontBody) root.style.setProperty('--font-body', `'${branding.fontBody}', system-ui, sans-serif`);
}

/**
 * Populate footer contact info from config.
 */
export function populateFooter(studio, social) {
  const footerContact = document.getElementById('footer-contact');
  if (footerContact) {
    footerContact.innerHTML = `
      <a href="tel:${studio.phone}">${studio.phone}</a>
      <a href="mailto:${studio.email}">${studio.email}</a>
      <span>${studio.address}</span>
      <a href="${social.instagramProfileUrl}" target="_blank" rel="noopener noreferrer">${social.instagramHandle}</a>
    `;
  }

  const footerCopy = document.getElementById('footer-copy');
  if (footerCopy) {
    footerCopy.textContent = `© ${new Date().getFullYear()} ${studio.name}. All rights reserved.`;
  }

  const navBrand = document.getElementById('nav-brand');
  if (navBrand) {
    navBrand.textContent = studio.name;
  }
}

/**
 * Wire up the mobile nav toggle.
 */
export function initNavToggle() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Close menu when a link is clicked
  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

/**
 * Mark the current page's nav link as active.
 */
export function setActiveNav() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.navbar__links a').forEach((a) => {
    const href = new URL(a.href).pathname.replace(/\/$/, '') || '/';
    if (href === path) {
      a.classList.add('active');
    }
  });
}
