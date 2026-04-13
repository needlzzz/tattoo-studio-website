/**
 * social.js — Renders social media icon links from config.
 *
 * Icons are fetched as SVG text from /icons/<platform>.svg and inlined,
 * so there is zero CDN dependency.
 */

const iconCache = new Map();

async function fetchIcon(platform) {
  if (iconCache.has(platform)) return iconCache.get(platform);
  try {
    const res = await fetch(`/icons/${platform}.svg`);
    if (!res.ok) throw new Error(`icon not found: ${platform}`);
    const svg = await res.text();
    iconCache.set(platform, svg);
    return svg;
  } catch {
    // Return a generic placeholder square if the icon is missing
    const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="4"/></svg>`;
    iconCache.set(platform, placeholder);
    return placeholder;
  }
}

/**
 * Render social links into a <ul> element.
 *
 * @param {HTMLElement} listEl  - the <ul> to populate
 * @param {Array}       accounts - array of { platform, url, label }
 */
export async function renderSocialLinks(listEl, accounts) {
  if (!listEl || !Array.isArray(accounts) || accounts.length === 0) return;

  const items = await Promise.all(
    accounts.map(async ({ platform, url, label }) => {
      const iconSvg = await fetchIcon(platform);
      const li = document.createElement('li');
      const a  = document.createElement('a');
      a.href             = url;
      a.target           = '_blank';
      a.rel              = 'noopener noreferrer';
      a.setAttribute('aria-label', label);
      a.innerHTML        = iconSvg;
      li.appendChild(a);
      return li;
    })
  );

  items.forEach((li) => listEl.appendChild(li));
}

export async function initSocial(config) {
  const accounts    = config.social?.accounts ?? [];
  const showInHeader = config.social?.showInHeader === true;

  // Footer social list
  const footerList = document.getElementById('footer-social-list');
  if (footerList) await renderSocialLinks(footerList, accounts);

  // Header social list (optional)
  const headerWrapper = document.getElementById('header-social');
  if (headerWrapper) {
    if (showInHeader) {
      headerWrapper.classList.remove('hidden');
      const headerList = headerWrapper.querySelector('.social-list');
      if (headerList) await renderSocialLinks(headerList, accounts);
    } else {
      headerWrapper.classList.add('hidden');
    }
  }
}
