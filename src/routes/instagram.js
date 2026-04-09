'use strict';

const express = require('express');
const { getFeed } = require('../services/instagramService');
const config = require('../../config.json');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const items = await getFeed(config.gallery.maxPhotosDisplayed);
    res.json({ items });
  } catch (err) {
    console.error('[Instagram route]', err.message);
    res.status(502).json({ error: 'Failed to load Instagram feed.' });
  }
});

module.exports = router;
