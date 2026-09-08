const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { findUserById } = require('../utils/helpers');

const router = express.Router();
const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

function removeExpiredStories() {
  const now = Date.now();
  const expired = db
    .get('stories')
    .filter((s) => now - new Date(s.createdAt).getTime() > STORY_LIFETIME_MS)
    .value();

  if (expired.length) {
    db.get('stories')
      .remove((s) => now - new Date(s.createdAt).getTime() > STORY_LIFETIME_MS)
      .write();
  }
}

// GET /api/stories - active stories from followed users + self
router.get('/', auth, (req, res) => {
  removeExpiredStories();

  const me = findUserById(req.userId);
  if (!me) return res.status(404).json({ error: 'User not found' });

  const authors = new Set([me.id, ...me.following]);
  const stories = db
    .get('stories')
    .filter((s) => authors.has(s.authorId))
    .sortBy('createdAt')
    .value()
    .reverse();

  res.json({ stories });
});

// POST /api/stories - create a story
router.post('/', auth, (req, res) => {
  removeExpiredStories();

  const { imageUrl } = req.body || {};
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  const story = {
    id: uuidv4(),
    authorId: req.userId,
    imageUrl,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + STORY_LIFETIME_MS).toISOString()
  };

  db.get('stories').push(story).write();
  res.status(201).json({ story });
});

module.exports = router;
