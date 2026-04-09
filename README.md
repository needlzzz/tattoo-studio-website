# Ink & Soul Tattoo Studio — Website

A complete tattoo studio website with an Instagram gallery, appointment booking system, and email-based owner confirmation flow.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5 · CSS3 · JavaScript (ES modules) |
| Backend | Node.js · Express |
| Database | SQLite via `better-sqlite3` |
| Email | Nodemailer (SMTP) |
| Instagram | Instagram Basic Display API (server-side proxy) |
| Security | Helmet · express-rate-limit · HMAC-signed tokens |

---

## Project structure

```
tattoo-studio-website/
├── config.json           # Non-secret studio config (committed)
├── .env                  # Secrets (NOT committed)
├── .env.example          # Template for .env
├── package.json
├── server.js             # Express entry point
├── src/
│   ├── routes/
│   │   ├── config.js     # GET /api/config
│   │   ├── instagram.js  # GET /api/instagram
│   │   └── booking.js    # POST /api/booking + confirm/decline
│   ├── services/
│   │   ├── bookingStore.js   # SQLite persistence
│   │   ├── instagramService.js # Feed fetch + cache + token refresh
│   │   └── mailer.js         # Nodemailer email helpers
│   └── utils/
│       ├── validation.js  # Server-side input sanitisation
│       └── tokens.js      # HMAC token sign/verify
├── public/
│   ├── index.html         # Landing page
│   ├── gallery.html       # Instagram gallery
│   ├── booking.html       # Appointment booking form
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── common.js      # Shared: config fetch, branding, nav
│       ├── index.js       # Home page logic
│       ├── gallery.js     # Gallery page logic
│       └── booking.js     # Booking form logic
└── data/
    └── bookings.db        # Created automatically on first run
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in all values (see comments in the file).

### 3. Configure studio info

Edit `config.json` to set your studio name, address, services, branding colours, and email templates.  
This file is committed and safe to edit — it contains no secrets.

### 4. Run locally

```bash
npm start
```

Or with auto-restart on file changes (Node ≥ 20):

```bash
npm run dev
```

The server starts at: **http://localhost:3000** (or the `PORT` you set in `.env`)

---

## Instagram Basic Display API setup

The gallery pulls your Instagram feed via a server-side proxy so your access token is never exposed to browsers.

### Step-by-step

1. **Create a Facebook Developer App** at [developers.facebook.com](https://developers.facebook.com).
2. Add the **Instagram Basic Display** product to your app.
3. Under *Instagram Basic Display → Basic Display*, add your Instagram account as a test user.
4. Generate a **short-lived access token** via the *User Token Generator*.
5. Exchange it for a **long-lived access token** (valid 60 days):

   ```bash
   curl "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=YOUR_APP_SECRET&access_token=YOUR_SHORT_LIVED_TOKEN"
   ```

6. Set the resulting token and your Instagram User ID in `.env`:

   ```
   INSTAGRAM_ACCESS_TOKEN=your_long_lived_token
   INSTAGRAM_USER_ID=your_user_id
   ```

### Token refresh

Long-lived tokens expire after ~60 days.  
The server automatically attempts to refresh the token each time the cache expires (every `INSTAGRAM_CACHE_TTL_SECONDS` seconds). The refreshed token is stored in-memory for the current process lifetime.

For production, run the server with a process manager (e.g. PM2) and monitor the logs for `[Instagram] Access token refreshed.` messages.

> **Tip:** Add a daily cron job or a startup script that hits `GET /api/instagram` to keep the token fresh automatically.

---

## Booking flow

1. Visitor submits the booking form (`POST /api/booking`).
2. Server validates and sanitises all fields, then stores the booking in SQLite.
3. Two emails are sent:
   - **Customer** receives a "booking received" confirmation.
   - **Owner** receives a notification with **Confirm** and **Decline** links.
4. Owner clicks **Confirm** → customer receives a confirmation email; status set to `confirmed`.
5. Owner clicks **Decline** → customer receives a polite rejection; status set to `declined`.
6. Confirm/decline links are HMAC-signed and expire after `BOOKING_TOKEN_EXPIRY_HOURS` hours.

---

## Security notes

- All secrets live in `.env` — never commit this file.
- User inputs are sanitised server-side before storage or sending.
- The booking `POST` endpoint is rate-limited (configurable via `.env`).
- Confirm/decline tokens use constant-time HMAC comparison to prevent timing attacks.
- HTTP security headers are applied via Helmet.
- The Instagram access token is never sent to the browser.

---

## Production checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Set a real `BASE_URL` (used in action email links)
- [ ] Generate a strong random `HMAC_SECRET` (e.g. `openssl rand -hex 32`)
- [ ] Configure a real SMTP provider (e.g. Mailgun, Postmark, Gmail SMTP)
- [ ] Place the server behind a reverse proxy (nginx / Caddy) with TLS
- [ ] Serve the site over HTTPS — confirm/decline links must use `https://`
- [ ] Set up a process manager (PM2, systemd) for restarts
