const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { findUserById, addNotification } = require('../utils/helpers');

const router = express.Router();

function conversationId(a, b) {
  return [a, b].sort().join(':');
}

// GET /api/messages/conversations - list conversation partners with last message
router.get('/conversations', auth, (req, res) => {
  const all = db
    .get('messages')
    .filter((m) => m.senderId === req.userId || m.recipientId === req.userId)
    .value();

  const partners = new Map();
  all.forEach((m) => {
    const partnerId = m.senderId === req.userId ? m.recipientId : m.senderId;
    const existing = partners.get(partnerId);
    if (!existing || new Date(m.createdAt) > new Date(existing.createdAt)) {
      partners.set(partnerId, m);
    }
  });

  const conversations = Array.from(partners.entries())
    .map(([partnerId, lastMessage]) => {
      const partner = findUserById(partnerId);
      return {
        partnerId,
        partnerUsername: partner ? partner.username : 'unknown',
        lastMessage
      };
    })
    .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

  res.json({ conversations });
});

// GET /api/messages/:userId - conversation history with a user
router.get('/:userId', auth, (req, res) => {
  const id = conversationId(req.userId, req.params.userId);
  const messages = db
    .get('messages')
    .filter({ conversationId: id })
    .sortBy('createdAt')
    .value();

  res.json({ messages });
});

// POST /api/messages/:userId - send a message
router.post('/:userId', auth, (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const recipient = findUserById(req.params.userId);
  if (!recipient) return res.status(404).json({ error: 'User not found' });

  const message = {
    id: uuidv4(),
    conversationId: conversationId(req.userId, req.params.userId),
    senderId: req.userId,
    recipientId: req.params.userId,
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  db.get('messages').push(message).write();
  addNotification({ recipientId: req.params.userId, actorId: req.userId, type: 'message' });

  res.status(201).json({ message });
});

module.exports = router;
