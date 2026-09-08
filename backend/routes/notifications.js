const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { findUserById } = require('../utils/helpers');

const router = express.Router();

// GET /api/notifications
router.get('/', auth, (req, res) => {
  const notifications = db
    .get('notifications')
    .filter({ recipientId: req.userId })
    .sortBy('createdAt')
    .value()
    .reverse()
    .map((n) => {
      const actor = findUserById(n.actorId);
      return { ...n, actorUsername: actor ? actor.username : 'unknown' };
    });

  res.json({ notifications });
});

// POST /api/notifications/:id/read
router.post('/:id/read', auth, (req, res) => {
  const notification = db.get('notifications').find({ id: req.params.id }).value();
  if (!notification || notification.recipientId !== req.userId) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  db.get('notifications').find({ id: req.params.id }).assign({ read: true }).write();
  res.json({ success: true });
});

// POST /api/notifications/read-all
router.post('/read-all', auth, (req, res) => {
  db.get('notifications')
    .filter({ recipientId: req.userId })
    .each((n) => {
      n.read = true;
    })
    .write();

  res.json({ success: true });
});

module.exports = router;
