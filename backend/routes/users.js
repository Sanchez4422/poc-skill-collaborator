const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { publicUser, findUserById, addNotification } = require('../utils/helpers');

const router = express.Router();

// GET /api/users/search?q=term
router.get('/search', auth, (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  if (!q) return res.json({ users: [] });

  const users = db
    .get('users')
    .filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q)
    )
    .value()
    .slice(0, 20)
    .map(publicUser);

  res.json({ users });
});

// GET /api/users/:username
router.get('/:username', auth, (req, res) => {
  const user = db
    .get('users')
    .find((u) => u.username.toLowerCase() === req.params.username.toLowerCase())
    .value();

  if (!user) return res.status(404).json({ error: 'User not found' });

  const posts = db
    .get('posts')
    .filter({ authorId: user.id })
    .sortBy('createdAt')
    .value()
    .reverse();

  res.json({ user: publicUser(user), posts });
});

// PUT /api/users/me
router.put('/me/update', auth, (req, res) => {
  const { fullName, bio, avatar } = req.body || {};
  const user = findUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const updates = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (bio !== undefined) updates.bio = bio;
  if (avatar !== undefined) updates.avatar = avatar;

  db.get('users').find({ id: req.userId }).assign(updates).write();
  res.json({ user: publicUser(findUserById(req.userId)) });
});

// POST /api/users/:id/follow
router.post('/:id/follow', auth, (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.userId) {
    return res.status(400).json({ error: 'You cannot follow yourself' });
  }

  const target = findUserById(targetId);
  const me = findUserById(req.userId);
  if (!target || !me) return res.status(404).json({ error: 'User not found' });

  if (!me.following.includes(targetId)) {
    db.get('users').find({ id: req.userId }).get('following').push(targetId).write();
    db.get('users').find({ id: targetId }).get('followers').push(req.userId).write();
    addNotification({ recipientId: targetId, actorId: req.userId, type: 'follow' });
  }

  res.json({ user: publicUser(findUserById(targetId)) });
});

// POST /api/users/:id/unfollow
router.post('/:id/unfollow', auth, (req, res) => {
  const targetId = req.params.id;
  const target = findUserById(targetId);
  const me = findUserById(req.userId);
  if (!target || !me) return res.status(404).json({ error: 'User not found' });

  db.get('users')
    .find({ id: req.userId })
    .assign({ following: me.following.filter((id) => id !== targetId) })
    .write();
  db.get('users')
    .find({ id: targetId })
    .assign({ followers: target.followers.filter((id) => id !== req.userId) })
    .write();

  res.json({ user: publicUser(findUserById(targetId)) });
});

module.exports = router;
