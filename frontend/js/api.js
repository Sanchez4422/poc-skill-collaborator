// Simple API client wrapping fetch calls to the backend.
const API_BASE = '/api';

const Api = {
  getToken() {
    return localStorage.getItem('instaclone_token');
  },
  setToken(token) {
    if (token) {
      localStorage.setItem('instaclone_token', token);
    } else {
      localStorage.removeItem('instaclone_token');
    }
  },
  async request(path, { method = 'GET', body, isForm = false } = {}) {
    const headers = {};
    const token = this.getToken();
    if (token) headers.Authorization = ['Bearer', token].join(' ');
    if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body)
    });

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok) {
      const message = (data && data.error) || `Request failed with status ${res.status}`;
      throw new Error(message);
    }
    return data;
  },

  register(payload) {
    return this.request('/auth/register', { method: 'POST', body: payload });
  },
  login(payload) {
    return this.request('/auth/login', { method: 'POST', body: payload });
  },
  me() {
    return this.request('/auth/me');
  },

  searchUsers(q) {
    return this.request(`/users/search?q=${encodeURIComponent(q)}`);
  },
  getUserProfile(username) {
    return this.request(`/users/${encodeURIComponent(username)}`);
  },
  updateProfile(payload) {
    return this.request('/users/me/update', { method: 'PUT', body: payload });
  },
  follow(userId) {
    return this.request(`/users/${userId}/follow`, { method: 'POST' });
  },
  unfollow(userId) {
    return this.request(`/users/${userId}/unfollow`, { method: 'POST' });
  },

  getFeed() {
    return this.request('/posts/feed');
  },
  createPost(formData) {
    return this.request('/posts', { method: 'POST', body: formData, isForm: true });
  },
  deletePost(id) {
    return this.request(`/posts/${id}`, { method: 'DELETE' });
  },
  likePost(id) {
    return this.request(`/posts/${id}/like`, { method: 'POST' });
  },
  unlikePost(id) {
    return this.request(`/posts/${id}/unlike`, { method: 'POST' });
  },
  commentOnPost(id, text) {
    return this.request(`/posts/${id}/comments`, { method: 'POST', body: { text } });
  },

  getStories() {
    return this.request('/stories');
  },
  createStory(imageUrl) {
    return this.request('/stories', { method: 'POST', body: { imageUrl } });
  },

  getConversations() {
    return this.request('/messages/conversations');
  },
  getMessages(userId) {
    return this.request(`/messages/${userId}`);
  },
  sendMessage(userId, text) {
    return this.request(`/messages/${userId}`, { method: 'POST', body: { text } });
  },

  getNotifications() {
    return this.request('/notifications');
  },
  markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'POST' });
  }
};
