const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { findUserById, addNotification } = require('../utils/helpers');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

function serializePost(post) {
  const author = findUserById(post.authorId);
  const comments = (post.comments || []).map((c) => {
    const commentAuthor = findUserById(c.authorId);
    return { ...c, authorUsername: commentAuthor ? commentAuthor.username : 'unknown' };
  });
  return {
    ...post,
    comments,
    authorUsername: author ? author.username : 'unknown',
    likesCount: (post.likes || []).length,
    commentsCount: comments.length
  };
}

// GET /api/posts/feed - posts from followed users + self
router.get('/feed', auth, (req, res) => {
  const me = findUserById(req.userId);
  if (!me) return res.status(404).json({ error: 'User not found' });

  const authors = new Set([me.id, ...me.following]);
  const posts = db
    .get('posts')
    .filter((p) => authors.has(p.authorId))
    .sortBy('createdAt')
    .value()
    .reverse()
    .map(serializePost);

  res.json({ posts });
});

// POST /api/posts - create a post
router.post('/', auth, upload.single('image'), (req, res) => {
  const { caption } = req.body || {};
  const imageUrl = req.file
    ? `/uploads/${req.file.filename}`
    : (req.body && req.body.imageUrl) || '';

  if (!imageUrl) {
    return res.status(400).json({ error: 'An image is required' });
  }

  const post = {
    id: uuidv4(),
    authorId: req.userId,
    imageUrl,
    caption: caption || '',
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };

  db.get('posts').push(post).write();
  res.status(201).json({ post: serializePost(post) });
});

// GET /api/posts/:id
router.get('/:id', auth, (req, res) => {
  const post = db.get('posts').find({ id: req.params.id }).value();
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json({ post: serializePost(post) });
});

// PUT /api/posts/:id - edit caption
router.put('/:id', auth, (req, res) => {
  const post = db.get('posts').find({ id: req.params.id }).value();
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.authorId !== req.userId) {
    return res.status(403).json({ error: 'Not authorized to edit this post' });
  }

  const { caption } = req.body || {};
  db.get('posts').find({ id: req.params.id }).assign({ caption: caption || '' }).write();
  res.json({ post: serializePost(db.get('posts').find({ id: req.params.id }).value()) });
});

// DELETE /api/posts/:id
router.delete('/:id', auth, (req, res) => {
  const post = db.get('posts').find({ id: req.params.id }).value();
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.authorId !== req.userId) {
    return res.status(403).json({ error: 'Not authorized to delete this post' });
  }

  db.get('posts').remove({ id: req.params.id }).write();
  res.json({ success: true });
});

// POST /api/posts/:id/like
router.post('/:id/like', auth, (req, res) => {
  const post = db.get('posts').find({ id: req.params.id }).value();
  if (!post) return res.status(404).json({ error: 'Post not found' });

  if (!post.likes.includes(req.userId)) {
    db.get('posts').find({ id: req.params.id }).get('likes').push(req.userId).write();
    addNotification({
      recipientId: post.authorId,
      actorId: req.userId,
      type: 'like',
      postId: post.id
    });
  }

  res.json({ post: serializePost(db.get('posts').find({ id: req.params.id }).value()) });
});

// POST /api/posts/:id/unlike
router.post('/:id/unlike', auth, (req, res) => {
  const post = db.get('posts').find({ id: req.params.id }).value();
  if (!post) return res.status(404).json({ error: 'Post not found' });

  db.get('posts')
    .find({ id: req.params.id })
    .assign({ likes: post.likes.filter((id) => id !== req.userId) })
    .write();

  res.json({ post: serializePost(db.get('posts').find({ id: req.params.id }).value()) });
});

// POST /api/posts/:id/comments
router.post('/:id/comments', auth, (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  const post = db.get('posts').find({ id: req.params.id }).value();
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const comment = {
    id: uuidv4(),
    authorId: req.userId,
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  db.get('posts').find({ id: req.params.id }).get('comments').push(comment).write();
  addNotification({
    recipientId: post.authorId,
    actorId: req.userId,
    type: 'comment',
    postId: post.id
  });

  res.status(201).json({ post: serializePost(db.get('posts').find({ id: req.params.id }).value()) });
});

module.exports = router;
