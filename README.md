# Instaclone — Instagram Clone Prototype

A full-featured Instagram-style social media web application, built as a working
prototype demonstrating all the core features of a photo-sharing social network.

## Features

**Frontend**
- User authentication (login / signup / logout)
- Home feed with posts from followed users
- User profiles with bio, follower/following counts, and a post grid
- Post creation with image URL and captions
- Like / unlike posts
- Comment on posts
- Follow / unfollow users
- Search users
- Stories (24-hour auto-expiring)
- Direct messaging between users
- Notifications (likes, comments, follows, messages)
- Responsive, mobile-friendly design

**Backend**
- User registration & authentication (JWT tokens, bcrypt password hashing)
- User profile management
- Post creation, editing, deletion
- Like / unlike functionality
- Comments on posts
- Follow / unfollow system
- User search
- Stories with automatic 24h expiration
- Messaging system
- Notification system
- Persistent JSON-file database (drop-in replaceable with MongoDB)

## Tech Stack

- **Frontend:** HTML, CSS, vanilla JavaScript (single-page app, hash-based router)
- **Backend:** Node.js + Express
- **Database:** File-based JSON database via [lowdb](https://github.com/typicode/lowdb)
  (a lightweight, dependency-free stand-in for MongoDB — the same document-oriented
  data shapes are used, so swapping in a real MongoDB/Mongoose layer later only
  requires changing `backend/db.js` and the query calls in `backend/routes/*.js`)
- **Authentication:** JWT (JSON Web Tokens) + bcrypt

## Project Structure

```
backend/            Express API server
  routes/            REST endpoints (auth, users, posts, stories, messages, notifications)
  middleware/auth.js JWT authentication middleware
  utils/helpers.js   Shared helpers (user serialization, notifications)
  db.js              lowdb database setup
  server.js          App entry point, also serves the frontend
  tests/             Jest + Supertest API tests
frontend/           Static single-page app served by the backend
  js/api.js          Fetch-based API client
  js/state.js        Shared client-side app state
  js/views/          One module per screen (auth, feed, profile, search, messages, notifications)
  js/app.js          Hash router and navigation
  css/style.css      Responsive styling
```

## Getting Started

```bash
cd backend
npm install
npm start
```

The server starts on `http://localhost:5000` by default (override with `PORT`) and
serves both the API (under `/api`) and the frontend (static files), so simply open
`http://localhost:5000` in your browser to use the app.

### Running tests

```bash
cd backend
npm test
```

## Notes

- Data is persisted to `backend/data/db.json` (ignored by git). Delete this file to
  reset the app to a blank state.
- Post images are provided as URLs (e.g. paste an `https://picsum.photos/...` link)
  to keep the prototype dependency-free; the backend also exposes an
  `/api/posts` multipart upload endpoint (`image` field) for direct file uploads,
  with uploaded files served from `/uploads`.
