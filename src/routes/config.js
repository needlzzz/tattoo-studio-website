'use strict';

const express = require('express');
const config = require('../../config.json');

const router = express.Router();

// Expose only non-sensitive fields to the frontend
const publicConfig = {
  studio: config.studio,
  social: config.social,
  gallery: config.gallery,
  booking: config.booking,
  branding: config.branding,
  seo: config.seo,
};

router.get('/', (req, res) => {
  res.json(publicConfig);
});

module.exports = router;
