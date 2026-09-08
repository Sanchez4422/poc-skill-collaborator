Views.search = {
  render(container) {
    container.innerHTML = `
      <div class="page search-page">
        <input id="search-input" placeholder="Search users..." />
        <div id="search-results" class="search-results"></div>
      </div>
    `;

    const input = container.querySelector('#search-input');
    const results = container.querySelector('#search-results');
    let debounceTimer;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = input.value.trim();
      if (!q) {
        results.innerHTML = '';
        return;
      }
      debounceTimer = setTimeout(async () => {
        try {
          const { users } = await Api.searchUsers(q);
          results.innerHTML =
            users
              .map(
                (u) => `
                <a class="search-result" href="#/profile/${escapeHtml(u.username)}">
                  <img src="${escapeHtml(u.avatar) || 'https://placehold.co/40'}" alt="avatar" />
                  <div>
                    <strong>${escapeHtml(u.username)}</strong>
                    <p>${escapeHtml(u.fullName)}</p>
                  </div>
                </a>`
              )
              .join('') || '<p class="empty-state">No users found.</p>';
        } catch (err) {
          results.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
        }
      }, 250);
    });
  }
};
