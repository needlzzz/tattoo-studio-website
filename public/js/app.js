/**
 * app.js — Main entry point.
 *
 * 1. Fetches /api/config (which includes the Google Maps API key)
 * 2. Applies branding CSS variables
 * 3. Initialises all feature modules
 * 4. Wires up navigation UX
 */

import { initGallery } from './gallery.js';
import { initBooking }  from './booking.js';
import { initMap }      from './map.js';
import { initSocial }   from './social.js';

// ── Boot ────────────────────────────────────────────────
async function boot() {
  let config;
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error(`/api/config returned ${res.status}`);
    config = await res.json();
  } catch (err) {
    console.error('Failed to load site config:', err);
    config = {};
  }

  applyBranding(config.branding);
  applyStudioText(config.studio);

  await Promise.all([
    initGallery(config),
    initSocial(config),
    initBooking(config),
  ]);

  // Map init is synchronous now (iframe, no external script to load)
  initMap(config);

  initNav();
  initScrollProgress();
}

// ── Branding ────────────────────────────────────────────
function applyBranding(branding) {
  if (!branding) return;
  const root = document.documentElement;
  if (branding.primaryColor) root.style.setProperty('--color-primary', branding.primaryColor);
  if (branding.accentColor)  root.style.setProperty('--color-accent',  branding.accentColor);
  if (branding.fontHeading)  root.style.setProperty('--font-heading',  `'${branding.fontHeading}', Georgia, serif`);
  if (branding.fontBody)     root.style.setProperty('--font-body',     `'${branding.fontBody}', system-ui, sans-serif`);
}

// ── Studio name/text ────────────────────────────────────
function applyStudioText(studio) {
  if (!studio) return;
  document.querySelectorAll('[data-studio-name]').forEach((el) => {
    el.textContent = studio.name ?? '';
  });
  document.querySelectorAll('[data-studio-tagline]').forEach((el) => {
    el.textContent = studio.tagline ?? '';
  });
  document.querySelectorAll('[data-studio-address]').forEach((el) => {
    el.textContent = studio.address ?? '';
  });
  document.querySelectorAll('[data-studio-phone]').forEach((el) => {
    el.textContent = studio.phone ?? '';
    if (el.tagName === 'A') el.href = `tel:${(studio.phone ?? '').replace(/\s/g, '')}`;
  });
  document.querySelectorAll('[data-studio-email]').forEach((el) => {
    el.textContent = studio.email ?? '';
    if (el.tagName === 'A') el.href = `mailto:${studio.email ?? ''}`;
  });
  document.querySelectorAll('[data-studio-hours]').forEach((el) => {
    el.textContent = studio.openingHours ?? '';
  });
}

// ── Navigation ──────────────────────────────────────────
function initNav() {
  // Hamburger toggle
  const hamburger = document.getElementById('hamburger');
  const nav       = document.getElementById('main-nav');
  hamburger?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
  });

  // Close mobile nav when a link is clicked
  nav?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      hamburger?.setAttribute('aria-expanded', 'false');
    });
  });

  // Active link on scroll
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('#main-nav a[href^="#"]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      });
    },
    { rootMargin: '-50% 0px -50% 0px' }
  );

  sections.forEach((s) => observer.observe(s));
}

// ── Scroll progress bar ────────────────────────────────
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  document.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const total    = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = total > 0 ? `${(scrolled / total) * 100}%` : '0%';
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', boot);
