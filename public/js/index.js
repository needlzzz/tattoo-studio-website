import { loadConfig, applyBranding, populateFooter, initNavToggle, setActiveNav } from './common.js';

async function init() {
  try {
    const config = await loadConfig();
    applyBranding(config.branding);
    populateFooter(config.studio, config.social);

    // Populate hero
    const heroTitle = document.getElementById('hero-title');
    const heroTagline = document.getElementById('hero-tagline');
    if (heroTitle) heroTitle.textContent = config.studio.name;
    if (heroTagline) heroTagline.textContent = config.studio.tagline;

    // Populate about strip
    const aboutPhone = document.getElementById('about-phone');
    const aboutEmail = document.getElementById('about-email');
    const aboutAddress = document.getElementById('about-address');
    const aboutHours = document.getElementById('about-hours');
    if (aboutPhone) aboutPhone.textContent = config.studio.phone;
    if (aboutEmail) aboutEmail.textContent = config.studio.email;
    if (aboutAddress) aboutAddress.textContent = config.studio.address;
    if (aboutHours) aboutHours.textContent = config.studio.openingHours;

    // Apply SEO meta tags
    document.title = `${config.studio.name} — ${config.studio.tagline}`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', config.seo.metaDescription);
  } catch (err) {
    console.error('Config load error:', err);
  }

  initNavToggle();
  setActiveNav();
}

init();
