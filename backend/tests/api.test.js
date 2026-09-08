process.env.DB_FILE = require('path').join(__dirname, 'test-db.json');
process.env.JWT_SECRET = 'test-secret';

const fs = require('fs');
const request = require('supertest');

const dbFile = process.env.DB_FILE;

beforeEach(() => {
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
  jest.resetModules();
});

afterAll(() => {
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
});

function loadApp() {
  return require('../server');
}

function authHeader(token) {
  const scheme = 'Bearer';
  return [scheme, token].join(' ');
}

async function registerUser(app, overrides = {}) {
  const payload = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    fullName: 'Test User',
    ...overrides
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  return { res, payload };
}

describe('Auth routes', () => {
  test('registers a new user and returns a token', async () => {
    const app = loadApp();
    const { res } = await registerUser(app);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('testuser');
    expect(res.body.user.password).toBeUndefined();
  });

  test('rejects duplicate username', async () => {
    const app = loadApp();
    await registerUser(app);
    const { res } = await registerUser(app, { email: 'other@example.com' });

    expect(res.status).toBe(409);
  });

  test('logs in with correct credentials', async () => {
    const app = loadApp();
    await registerUser(app);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects login with wrong password', async () => {
    const app = loadApp();
    await registerUser(app);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  test('returns current user with valid token', async () => {
    const app = loadApp();
    const { res: regRes } = await registerUser(app);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', authHeader(regRes.body.token));

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('testuser');
  });

  test('rejects request without token', async () => {
    const app = loadApp();
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Users routes', () => {
  async function createTwoUsers(app) {
    const a = await registerUser(app, { username: 'alice', email: 'alice@example.com' });
    const b = await registerUser(app, { username: 'bob', email: 'bob@example.com' });
    return { alice: a.res.body, bob: b.res.body };
  }

  test('follows and unfollows a user', async () => {
    const app = loadApp();
    const { alice, bob } = await createTwoUsers(app);

    const followRes = await request(app)
      .post(`/api/users/${bob.user.id}/follow`)
      .set('Authorization', authHeader(alice.token));

    expect(followRes.status).toBe(200);
    expect(followRes.body.user.followersCount).toBe(1);

    const unfollowRes = await request(app)
      .post(`/api/users/${bob.user.id}/unfollow`)
      .set('Authorization', authHeader(alice.token));

    expect(unfollowRes.status).toBe(200);
    expect(unfollowRes.body.user.followersCount).toBe(0);
  });

  test('prevents following yourself', async () => {
    const app = loadApp();
    const { alice } = await createTwoUsers(app);

    const res = await request(app)
      .post(`/api/users/${alice.user.id}/follow`)
      .set('Authorization', authHeader(alice.token));

    expect(res.status).toBe(400);
  });

  test('searches users by username', async () => {
    const app = loadApp();
    const { alice } = await createTwoUsers(app);

    const res = await request(app)
      .get('/api/users/search?q=bob')
      .set('Authorization', authHeader(alice.token));

    expect(res.status).toBe(200);
    expect(res.body.users.length).toBe(1);
    expect(res.body.users[0].username).toBe('bob');
  });

  test('gets a user profile with posts', async () => {
    const app = loadApp();
    const { alice } = await createTwoUsers(app);

    const res = await request(app)
      .get('/api/users/alice')
      .set('Authorization', authHeader(alice.token));

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('alice');
    expect(res.body.posts).toEqual([]);
  });
});

describe('Posts routes', () => {
  test('creates a post, likes, comments, and appears in feed', async () => {
    const app = loadApp();
    const { res: regRes } = await registerUser(app);
    const token = regRes.body.token;

    const createRes = await request(app)
      .post('/api/posts')
      .set('Authorization', authHeader(token))
      .send({ imageUrl: 'http://example.com/image.jpg', caption: 'Hello world' });

    expect(createRes.status).toBe(201);
    const postId = createRes.body.post.id;

    const likeRes = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', authHeader(token));
    expect(likeRes.body.post.likesCount).toBe(1);

    const unlikeRes = await request(app)
      .post(`/api/posts/${postId}/unlike`)
      .set('Authorization', authHeader(token));
    expect(unlikeRes.body.post.likesCount).toBe(0);

    const commentRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', authHeader(token))
      .send({ text: 'Nice post!' });
    expect(commentRes.status).toBe(201);
    expect(commentRes.body.post.commentsCount).toBe(1);

    const feedRes = await request(app)
      .get('/api/posts/feed')
      .set('Authorization', authHeader(token));
    expect(feedRes.body.posts.length).toBe(1);
  });

  test('requires an image to create a post', async () => {
    const app = loadApp();
    const { res: regRes } = await registerUser(app);

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', authHeader(regRes.body.token))
      .send({ caption: 'No image' });

    expect(res.status).toBe(400);
  });

  test('only the author can delete a post', async () => {
    const app = loadApp();
    const owner = await registerUser(app, { username: 'owner', email: 'owner@example.com' });
    const other = await registerUser(app, { username: 'other', email: 'other@example.com' });

    const createRes = await request(app)
      .post('/api/posts')
      .set('Authorization', authHeader(owner.res.body.token))
      .send({ imageUrl: 'http://example.com/image.jpg' });

    const postId = createRes.body.post.id;

    const deleteRes = await request(app)
      .delete(`/api/posts/${postId}`)
      .set('Authorization', authHeader(other.res.body.token));

    expect(deleteRes.status).toBe(403);
  });
});

describe('Stories routes', () => {
  test('creates a story and lists it while active', async () => {
    const app = loadApp();
    const { res: regRes } = await registerUser(app);
    const token = regRes.body.token;

    const createRes = await request(app)
      .post('/api/stories')
      .set('Authorization', authHeader(token))
      .send({ imageUrl: 'http://example.com/story.jpg' });

    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get('/api/stories')
      .set('Authorization', authHeader(token));

    expect(listRes.body.stories.length).toBe(1);
  });
});

describe('Messages routes', () => {
  test('sends and retrieves messages between users', async () => {
    const app = loadApp();
    const alice = await registerUser(app, { username: 'alice', email: 'alice@example.com' });
    const bob = await registerUser(app, { username: 'bob', email: 'bob@example.com' });

    const sendRes = await request(app)
      .post(`/api/messages/${bob.res.body.user.id}`)
      .set('Authorization', authHeader(alice.res.body.token))
      .send({ text: 'Hi Bob!' });

    expect(sendRes.status).toBe(201);

    const historyRes = await request(app)
      .get(`/api/messages/${bob.res.body.user.id}`)
      .set('Authorization', authHeader(alice.res.body.token));

    expect(historyRes.body.messages.length).toBe(1);
    expect(historyRes.body.messages[0].text).toBe('Hi Bob!');
  });
});

describe('Notifications routes', () => {
  test('receives a notification when someone follows you', async () => {
    const app = loadApp();
    const alice = await registerUser(app, { username: 'alice', email: 'alice@example.com' });
    const bob = await registerUser(app, { username: 'bob', email: 'bob@example.com' });

    await request(app)
      .post(`/api/users/${bob.res.body.user.id}/follow`)
      .set('Authorization', authHeader(alice.res.body.token));

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', authHeader(bob.res.body.token));

    expect(res.body.notifications.length).toBe(1);
    expect(res.body.notifications[0].type).toBe('follow');
  });
});
