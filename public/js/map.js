/**
 * map.js — Google Maps embed (iframe)
 *
 * Uses the free Google Maps embed URL — no API key required.
 * Coordinates are read from config.json (served via /api/config).
 */

export function initMap(config) {
  const mapContainer = document.getElementById('map-container');
  const fallback      = document.getElementById('map-fallback');

  if (!mapContainer) return;

  const { lat, lng } = config.studio?.coordinates ?? {};
  if (!lat || !lng) {
    // No coordinates configured — show plain-text fallback address
    mapContainer.classList.add('hidden');
    fallback?.classList.add('visible');
    return;
  }

  // Build the embed URL (no API key needed)
  const embedUrl =
    `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&z=15&output=embed`;

  const iframe = document.createElement('iframe');
  iframe.src               = embedUrl;
  iframe.width             = '100%';
  iframe.height            = '100%';
  iframe.style.border      = '0';
  iframe.loading           = 'lazy';
  iframe.referrerPolicy    = 'no-referrer-when-downgrade';
  iframe.allowFullscreen   = true;
  iframe.setAttribute('aria-label', `Map showing ${config.studio?.name ?? 'studio'} location`);

  mapContainer.appendChild(iframe);

  // Wire up "Get Directions" button(s) with a plain deep-link URL
  const directionsUrl =
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` +
    (config.studio?.googleMapsPlaceId
      ? `&destination_place_id=${encodeURIComponent(config.studio.googleMapsPlaceId)}`
      : '');

  document.querySelectorAll('[data-directions]').forEach((btn) => {
    btn.href = directionsUrl;
  });
}
