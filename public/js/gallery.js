import { loadConfig, applyBranding, populateFooter, initNavToggle, setActiveNav } from './common.js';

async function init() {
  let cfg;
  try {
    cfg = await loadConfig();
    applyBranding(cfg.branding);
    populateFooter(cfg.studio, cfg.social);
    document.title = `Gallery — ${cfg.studio.name}`;
  } catch (err) {
    console.error('Config load error:', err);
  }

  initNavToggle();
  setActiveNav();
  await renderGallery(cfg);
}

async function renderGallery(cfg) {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  const cols = cfg?.gallery?.columns || { desktop: 4, tablet: 3, mobile: 2 };
  grid.style.setProperty('--gallery-cols-desktop', cols.desktop);
  grid.style.setProperty('--gallery-cols-tablet', cols.tablet);
  grid.style.setProperty('--gallery-cols-mobile', cols.mobile);

  // Show skeleton placeholders
  const skeletonCount = cfg?.gallery?.maxPhotosDisplayed || 12;
  grid.innerHTML = Array.from({ length: Math.min(skeletonCount, 24) })
    .map(() => '<div class="gallery-skeleton" aria-hidden="true"></div>')
    .join('');

  try {
    const resp = await fetch('/api/instagram');
    if (!resp.ok) throw new Error('Feed unavailable');
    const { items } = await resp.json();

    if (!items || items.length === 0) {
      showFallback(grid, cfg);
      return;
    }

    grid.innerHTML = items
      .map((item) => {
        const imgSrc = item.media_url || item.thumbnail_url || '';
        const caption = item.caption ? escapeHtml(item.caption.slice(0, 100)) : cfg?.studio?.name || '';
        return `
          <a class="gallery-item" href="${item.permalink}" target="_blank" rel="noopener noreferrer" aria-label="View on Instagram">
            <img src="${imgSrc}" alt="${caption}" loading="lazy" decoding="async">
            <div class="gallery-item__overlay">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </div>
          </a>`;
      })
      .join('');
  } catch (err) {
    console.error('[Gallery]', err);
    showFallback(grid, cfg);
  }
}

function showFallback(grid, cfg) {
  const handle = cfg?.social?.instagramHandle || '@inksoultattoo';
  const url = cfg?.social?.instagramProfileUrl || 'https://www.instagram.com';
  grid.innerHTML = `
    <div class="gallery-fallback">
      <p>Could not load the gallery at this time.</p>
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="btn btn--outline">
        Follow us on Instagram ${handle}
      </a>
    </div>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

init();
