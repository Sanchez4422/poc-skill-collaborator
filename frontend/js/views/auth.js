const Views = {};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

Views.auth = {
  render(container, { mode }) {
    container.innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <h1 class="logo">Instaclone</h1>
          <div class="auth-tabs">
            <button class="tab-btn ${mode === 'login' ? 'active' : ''}" data-tab="login">Log In</button>
            <button class="tab-btn ${mode === 'signup' ? 'active' : ''}" data-tab="signup">Sign Up</button>
          </div>
          <form id="auth-form">
            ${mode === 'signup' ? '<input name="fullName" placeholder="Full name" required />' : ''}
            <input name="username" placeholder="Username" required />
            ${mode === 'signup' ? '<input name="email" type="email" placeholder="Email" required />' : ''}
            <input name="password" type="password" placeholder="Password" required minlength="6" />
            <button type="submit" class="primary-btn">${mode === 'login' ? 'Log In' : 'Sign Up'}</button>
          </form>
          <p id="auth-error" class="error-text"></p>
        </div>
      </div>
    `;

    container.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        location.hash = btn.dataset.tab === 'login' ? '#/login' : '#/signup';
      });
    });

    container.querySelector('#auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const payload = Object.fromEntries(formData.entries());
      const errorEl = container.querySelector('#auth-error');
      errorEl.textContent = '';
      try {
        const result =
          mode === 'login' ? await Api.login(payload) : await Api.register(payload);
        Api.setToken(result.token);
        State.setCurrentUser(result.user);
        location.hash = '#/feed';
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
  }
};
