'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const path = require('path');

const config = require('./config.json');
const instagramRouter = require('./src/routes/instagram');
const bookingRouter = require('./src/routes/booking');
const configRouter = require('./src/routes/config');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://fonts.googleapis.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://cdnjs.instagram.com', 'https://*.cdninstagram.com', 'https://scontent.cdninstagram.com', 'https://*.fbcdn.net'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/config', configRouter);
app.use('/api/instagram', instagramRouter);
app.use('/api/booking', bookingRouter);

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/gallery', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gallery.html')));
app.get('/booking', (req, res) => res.sendFile(path.join(__dirname, 'public', 'booking.html')));

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Ink & Soul server listening on http://localhost:${PORT}`);
});

module.exports = app;
