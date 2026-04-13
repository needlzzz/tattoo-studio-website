/**
 * gallery.js — Gallery grid and lightbox
 */

let galleryItems = []; // [{id, filename, thumbFilename}]
let lightboxIndex = 0;

// ── Public API ──────────────────────────────────────────
export async function initGallery(config) {
  applyColumnConfig(config.gallery?.columns);

  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  // Show skeletons while loading
  const count = config.gallery?.columns?.desktop ?? 4;
  for (let i = 0; i < count * 2; i++) {
    const skel = document.createElement('div');
    skel.className = 'gallery-item skeleton';
    grid.appendChild(skel);
  }

  try {
    const res = await fetch('/api/gallery');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    galleryItems = await res.json();
  } catch (err) {
    console.error('Gallery fetch failed:', err);
    grid.innerHTML = '<p class="gallery-grid--empty">Gallery temporarily unavailable.</p>';
    return;
  }

  grid.innerHTML = '';

  if (galleryItems.length === 0) {
    grid.innerHTML = '<p class="gallery-grid--empty">No photos yet — check back soon!</p>';
    return;
  }

  galleryItems.forEach((item, idx) => {
    const el = createThumbElement(item, idx);
    grid.appendChild(el);
  });

  initLightbox();
}

// ── Column CSS vars ────────────────────────────────────
function applyColumnConfig(cols) {
  if (!cols) return;
  const root = document.documentElement;
  if (cols.desktop) root.style.setProperty('--gallery-cols-desktop', cols.desktop);
  if (cols.tablet)  root.style.setProperty('--gallery-cols-tablet',  cols.tablet);
  if (cols.mobile)  root.style.setProperty('--gallery-cols-mobile',  cols.mobile);
}

// ── Thumbnail element ───────────────────────────────────
function createThumbElement(item, idx) {
  const btn = document.createElement('button');
  btn.className = 'gallery-item';
  btn.setAttribute('aria-label', `View photo ${idx + 1}`);
  btn.dataset.index = idx;

  const img = document.createElement('img');
  img.src = `/uploads/${item.thumbFilename}`;
  img.alt = `Tattoo photo ${idx + 1}`;
  img.loading = 'lazy';
  // Prevent layout shift — thumb dimensions are always 400×400 max (preserved AR)
  img.width  = 400;
  img.height = 400;

  btn.appendChild(img);
  btn.addEventListener('click', () => openLightbox(idx));
  return btn;
}

// ── Lightbox ───────────────────────────────────────────
function initLightbox() {
  const lb      = document.getElementById('lightbox');
  const btnClose = document.getElementById('lightbox-close');
  const btnPrev  = document.getElementById('lightbox-prev');
  const btnNext  = document.getElementById('lightbox-next');

  if (!lb) return;

  btnClose.addEventListener('click', closeLightbox);
  btnPrev.addEventListener('click',  () => navigate(-1));
  btnNext.addEventListener('click',  () => navigate(1));

  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
}

function openLightbox(idx) {
  lightboxIndex = idx;
  renderLightboxImage();
  const lb = document.getElementById('lightbox');
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
  lb.querySelector('#lightbox-close').focus();
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  // Return focus to the triggering thumbnail
  const btn = document.querySelector(`.gallery-item[data-index="${lightboxIndex}"]`);
  btn?.focus();
}

function navigate(dir) {
  lightboxIndex = (lightboxIndex + dir + galleryItems.length) % galleryItems.length;
  renderLightboxImage();
}

function renderLightboxImage() {
  const lb  = document.getElementById('lightbox');
  const img = lb.querySelector('img');
  const item = galleryItems[lightboxIndex];

  img.style.opacity = '0';
  img.src = `/uploads/${item.filename}`;
  img.alt = `Tattoo photo ${lightboxIndex + 1} of ${galleryItems.length}`;
  img.onload = () => { img.style.opacity = '1'; };
}
