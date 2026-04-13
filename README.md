# Ink & Soul Tattoo Studio — Website

A complete single-page tattoo studio website built with **vanilla HTML/CSS/JS** on the frontend and **Node.js + Express** on the backend. No frameworks, no page builders.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Local Setup](#local-setup)
3. [Environment Variables](#environment-variables)
4. [Google Maps Setup](#google-maps-setup)
5. [SMTP / Email Setup](#smtp--email-setup)
6. [Gallery — Uploading Images](#gallery--uploading-images)
7. [Customisation (config.json)](#customisation-configjson)
8. [Running in Production](#running-in-production)

---

## Project Structure

```
.
├── config.json               # Non-secret site configuration
├── .env.example              # Environment variable template
├── package.json
├── data/
│   ├── gallery.json          # Auto-generated; gitignored
│   └── bookings.json         # Auto-generated; gitignored
├── public/
│   ├── index.html            # Single-page application
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js            # Entry point (ES module)
│   │   ├── gallery.js
│   │   ├── booking.js
│   │   ├── map.js
│   │   └── social.js
│   ├── icons/                # Inline SVG social icons
│   │   ├── instagram.svg
│   │   ├── facebook.svg
│   │   ├── tiktok.svg
│   │   ├── youtube.svg
│   │   ├── x.svg
│   │   └── pinterest.svg
│   └── uploads/              # Server-managed; gitignored
└── src/
    ├── server.js             # Express app entry point
    ├── routes/
    │   ├── gallery.js        # POST /api/gallery/upload, GET/DELETE /api/gallery
    │   ├── booking.js        # POST /api/booking, GET /api/booking/:id/confirm|decline
    │   └── config.js         # GET /api/config
    ├── middleware/
    │   └── auth.js           # Admin Bearer token check
    └── utils/
        ├── jsonStore.js      # Mutex-guarded JSON file reads/writes
        ├── mutex.js          # Async mutex (no external dependency)
        ├── sanitize.js       # HTML stripping, email/phone validation
        ├── tokens.js         # HMAC-SHA256 token sign/verify
        └── mailer.js         # Nodemailer wrapper with template substitution
```

---

## Local Setup

### Prerequisites

- **Node.js ≥ 20**
- **npm ≥ 10**

### Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd tattoo-studio-website

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Edit .env — see "Environment Variables" below

# 4. Start the development server
npm run dev
# or: npm start
```

Open [http://localhost:3000](http://localhost:3000).

> `npm run dev` uses Node.js's built-in `--watch` flag (Node 18+) for automatic restarts on file changes. No nodemon needed.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port (default: `3000`) |
| `NODE_ENV` | No | `production` or `development` |
| `BASE_URL` | **Yes** | Public URL used in confirm/decline email links (e.g. `https://your-domain.com`) |
| `GOOGLE_MAPS_API_KEY` | No | Google Maps JS API key — if unset, the map is hidden and fallback address is shown |
| `SMTP_HOST` | **Yes** | SMTP server hostname |
| `SMTP_PORT` | **Yes** | SMTP port (typically `587` for STARTTLS, `465` for SSL) |
| `SMTP_SECURE` | No | `true` for SSL (port 465), `false` for STARTTLS |
| `SMTP_USER` | **Yes** | SMTP login username |
| `SMTP_PASS` | **Yes** | SMTP login password |
| `OWNER_EMAIL` | **Yes** | Email address that receives new booking notifications |
| `FROM_EMAIL` | **Yes** | The "from" address used in all outbound emails |
| `FROM_NAME` | No | Display name for outbound emails |
| `HMAC_SECRET` | **Yes** | Long random secret for signing booking tokens — generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `BOOKING_TOKEN_EXPIRY_HOURS` | No | How long confirm/decline links stay valid (default: `48`) |
| `RATE_LIMIT_WINDOW_MINUTES` | No | Rate-limit window for booking submissions (default: `15`) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max booking submissions per window (default: `10`) |
| `UPLOAD_RATE_LIMIT_MAX` | No | Max gallery uploads per window (default: `20`) |
| `ADMIN_UPLOAD_PASSWORD` | **Yes** | Password to authenticate gallery uploads — sent as a `Bearer` token |
| `MAX_UPLOAD_SIZE_MB` | No | Maximum accepted upload file size in MB (default: `10`) |

---

## Google Maps Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Maps JavaScript API**.
3. Create an API key; restrict it to:
   - **HTTP referrers**: your domain(s) (e.g. `https://your-domain.com/*`)
   - **APIs**: Maps JavaScript API only
4. Copy the key into `.env`:
   ```
   GOOGLE_MAPS_API_KEY=AIza...
   ```
5. Update `config.json` with your studio coordinates:
   ```json
   "studio": {
     "coordinates": { "lat": 47.3769, "lng": 8.5417 }
   }
   ```
6. Optionally add `googleMapsPlaceId` (from Google Maps URL) to deep-link to your business listing.

If `GOOGLE_MAPS_API_KEY` is empty or not set, the map section automatically hides and shows the plain-text address instead.

---

## SMTP / Email Setup

Any SMTP-compatible service works (Gmail, SendGrid, Mailgun, Postmark, etc.).

### Gmail example

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your_app_password   # Use an App Password, not your normal password
```

### SendGrid example

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_api_key
```

Email subject lines and body templates are fully customisable in `config.json` under `email.subjects` and `email.templates`. Use `{placeholder}` syntax — supported tokens: `{studioName}`, `{firstName}`, `{lastName}`, `{service}`, `{preferredDate}`, `{preferredTime}`, `{phone}`, `{email}`, `{message}`, `{confirmLink}`, `{declineLink}`.

---

## Gallery — Uploading Images

The upload endpoint is **password-protected**. You must send the `ADMIN_UPLOAD_PASSWORD` as a Bearer token.

### Using curl

```bash
curl -X POST https://your-domain.com/api/gallery/upload \
  -H "Authorization: Bearer YOUR_ADMIN_UPLOAD_PASSWORD" \
  -F "image=@/path/to/photo.jpg"
```

### Response

```json
{
  "id": "a1b2c3d4-e5f6-...",
  "filename": "a1b2c3d4-e5f6-....jpg",
  "thumbFilename": "a1b2c3d4-e5f6-..._thumb.jpg",
  "uploadedAt": "2026-04-13T10:00:00.000Z"
}
```

The server will:
- Reject files that are not JPEG, PNG, or WebP
- Resize the full image so the longest side ≤ 1600 px (JPEG quality 80)
- Create a thumbnail with the longest side ≤ 400 px (JPEG quality 70)
- Save both to `public/uploads/` and update `data/gallery.json`

### Deleting an image

```bash
curl -X DELETE https://your-domain.com/api/gallery/PHOTO_ID \
  -H "Authorization: Bearer YOUR_ADMIN_UPLOAD_PASSWORD"
```

### Display settings

In `config.json`, the `gallery` section controls how photos appear:

```json
"gallery": {
  "maxPhotosDisplayed": 24,
  "columns": { "desktop": 4, "tablet": 3, "mobile": 2 }
}
```

---

## Customisation (config.json)

All non-secret site settings live in `config.json`:

| Path | Description |
|---|---|
| `studio.*` | Studio name, tagline, address, phone, email, hours, coordinates |
| `social.accounts` | Array of `{ platform, url, label }` — add/remove platforms here |
| `social.showInHeader` | Show social icons in the header on mobile |
| `gallery.maxPhotosDisplayed` | Cap on how many photos the gallery shows |
| `gallery.columns` | CSS grid column counts per breakpoint |
| `booking.availableServices` | Dropdown options in the booking form |
| `booking.minNoticeDays` | Minimum days in advance a booking can be made |
| `booking.maxAdvanceBookingDays` | Maximum days in advance a booking can be made |
| `branding.primaryColor` / `accentColor` | CSS custom property values |
| `branding.fontHeading` / `fontBody` | Google Fonts family names |
| `email.subjects.*` | Email subject lines (support `{placeholder}` tokens) |
| `email.templates.*` | Email body templates (support `{placeholder}` tokens) |

---

## Running in Production

### 1. Set environment variables

Copy `.env.example` to `.env` and fill in **all required** values. On a server you may prefer to set environment variables via your process manager or hosting platform rather than a `.env` file.

### 2. Install production dependencies only

```bash
npm install --omit=dev
```

### 3. Start with a process manager (recommended)

**PM2:**

```bash
npm install -g pm2
pm2 start src/server.js --name tattoo-studio
pm2 save
pm2 startup   # follow the printed instructions to auto-start on reboot
```

**systemd** or **Docker** also work — the app is a plain Node.js process.

### 4. Reverse proxy (nginx)

Put nginx in front of Node.js so it handles TLS and static asset caching:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    # ... ssl_certificate, ssl_certificate_key ...

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Set `NODE_ENV=production`

This enables the `trust proxy` setting in Express so that `express-rate-limit` reads the client IP from the `X-Forwarded-For` header correctly.

### 6. Uploads persistence

The `public/uploads/` folder is **not committed to git**. Make sure it:
- Persists across deployments (e.g. a Docker volume or a persistent disk)
- Is backed up regularly

---

## Security Notes

- All user input is HTML-stripped server-side before storage or emailing
- Booking confirm/decline tokens use HMAC-SHA256 with a constant-time comparison
- The Google Maps API key is served via `/api/config` — never baked into static HTML
- HTTP security headers are set via `helmet` with a strict Content-Security-Policy
- Rate limiting is applied separately to booking submissions and gallery uploads
- The admin upload password is validated on the server; the comparison is done in constant-time by Node's string equality (single string check — not a crypto primitive, but the password is never exposed in responses)
