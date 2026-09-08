const db = require('../db');

function publicUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return {
    ...rest,
    followersCount: (user.followers || []).length,
    followingCount: (user.following || []).length
  };
}

function findUserById(id) {
  return db.get('users').find({ id }).value();
}

function findUserByUsername(username) {
  return db
    .get('users')
    .find((u) => u.username.toLowerCase() === String(username).toLowerCase())
    .value();
}

function addNotification({ recipientId, actorId, type, postId }) {
  if (recipientId === actorId) return; // don't notify yourself
  const notification = {
    id: require('uuid').v4(),
    recipientId,
    actorId,
    type, // 'like' | 'comment' | 'follow' | 'message'
    postId: postId || null,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.get('notifications').push(notification).write();
  return notification;
}

module.exports = { publicUser, findUserById, findUserByUsername, addNotification };
