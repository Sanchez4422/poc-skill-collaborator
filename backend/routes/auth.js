const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { JWT_SECRET, auth } = require('../middleware/auth');
const { publicUser, findUserByUsername, findUserById } = require('../utils/helpers');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, fullName } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db
    .get('users')
    .find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() ||
        u.email.toLowerCase() === email.toLowerCase()
    )
    .value();

  if (existing) {
    return res.status(409).json({ error: 'Username or email already in use' });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = {
    id: uuidv4(),
    username,
    email,
    password: hashed,
    fullName: fullName || username,
    bio: '',
    avatar: '',
    followers: [],
    following: [],
    createdAt: new Date().toISOString()
  };

  db.get('users').push(user).write();

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const user = findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const user = findUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
