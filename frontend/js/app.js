const appEl = document.getElementById('app');

function renderNav() {
  return `
    <nav class="navbar">
      <a href="#/feed" class="nav-logo">Instaclone</a>
      <div class="nav-links">
        <a href="#/feed">🏠 Home</a>
        <a href="#/search">🔍 Search</a>
        <a href="#/messages">✉️ Messages</a>
        <a href="#/notifications">🔔 Notifications</a>
        <a href="#/profile/${State.currentUser ? State.currentUser.username : ''}">👤 Profile</a>
        <button id="logout-btn">Log Out</button>
      </div>
    </nav>
  `;
}

function parseRoute() {
  const hash = location.hash.replace(/^#/, '') || '/feed';
  const parts = hash.split('/').filter(Boolean);
  return parts;
}

async function router() {
  const token = Api.getToken();
  const parts = parseRoute();
  const route = parts[0] || 'feed';

  if (!token) {
    if (route !== 'login' && route !== 'signup') {
      location.hash = '#/login';
      return;
    }
    appEl.innerHTML = '<div id="view"></div>';
    Views.auth.render(document.getElementById('view'), { mode: route });
    return;
  }

  if (!State.currentUser) {
    try {
      const { user } = await Api.me();
      State.setCurrentUser(user);
    } catch (err) {
      Api.setToken(null);
      location.hash = '#/login';
      return;
    }
  }

  if (route === 'login' || route === 'signup') {
    location.hash = '#/feed';
    return;
  }

  appEl.innerHTML = `${renderNav()}<div id="view"></div>`;
  const view = document.getElementById('view');

  document.getElementById('logout-btn').addEventListener('click', () => {
    Api.setToken(null);
    State.setCurrentUser(null);
    location.hash = '#/login';
  });

  switch (route) {
    case 'feed':
      await Views.feed.render(view);
      break;
    case 'profile':
      await Views.profile.render(view, { username: parts[1] });
      break;
    case 'search':
      Views.search.render(view);
      break;
    case 'messages':
      await Views.messages.render(view, { userId: parts[1] });
      break;
    case 'notifications':
      await Views.notifications.render(view);
      break;
    default:
      location.hash = '#/feed';
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
