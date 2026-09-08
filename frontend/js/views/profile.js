Views.profile = {
  async render(container, { username }) {
    container.innerHTML = '<div class="page">Loading profile...</div>';
    try {
      const { user, posts } = await Api.getUserProfile(username);
      const isMe = State.currentUser && State.currentUser.id === user.id;
      const isFollowing = State.currentUser && (user.followers || []).includes(State.currentUser.id);

      container.innerHTML = `
        <div class="page profile-page">
          <div class="profile-header">
            <img class="profile-avatar" src="${escapeHtml(user.avatar) || 'https://placehold.co/150'}" alt="avatar" />
            <div class="profile-info">
              <div class="profile-name-row">
                <h2>${escapeHtml(user.username)}</h2>
                ${
                  isMe
                    ? '<button id="edit-profile-btn">Edit Profile</button>'
                    : `<button id="follow-btn">${isFollowing ? 'Unfollow' : 'Follow'}</button>`
                }
                ${!isMe ? `<button id="message-btn">Message</button>` : ''}
              </div>
              <div class="profile-stats">
                <span><strong>${posts.length}</strong> posts</span>
                <span><strong>${user.followersCount}</strong> followers</span>
                <span><strong>${user.followingCount}</strong> following</span>
              </div>
              <p class="profile-fullname">${escapeHtml(user.fullName)}</p>
              <p class="profile-bio">${escapeHtml(user.bio)}</p>
            </div>
          </div>
          <div class="post-grid">
            ${posts
              .map(
                (p) => `<div class="grid-item"><img src="${escapeHtml(p.imageUrl)}" alt="post" /></div>`
              )
              .join('') || '<p class="empty-state">No posts yet.</p>'}
          </div>
        </div>
      `;

      const followBtn = container.querySelector('#follow-btn');
      if (followBtn) {
        followBtn.addEventListener('click', async () => {
          try {
            if (isFollowing) {
              await Api.unfollow(user.id);
            } else {
              await Api.follow(user.id);
            }
            await this.render(container, { username });
          } catch (err) {
            alert(err.message);
          }
        });
      }

      const messageBtn = container.querySelector('#message-btn');
      if (messageBtn) {
        messageBtn.addEventListener('click', () => {
          location.hash = `#/messages/${user.id}`;
        });
      }

      const editBtn = container.querySelector('#edit-profile-btn');
      if (editBtn) {
        editBtn.addEventListener('click', async () => {
          const bio = prompt('New bio:', user.bio || '');
          if (bio === null) return;
          try {
            const { user: updated } = await Api.updateProfile({ bio });
            State.setCurrentUser(updated);
            await this.render(container, { username });
          } catch (err) {
            alert(err.message);
          }
        });
      }
    } catch (err) {
      container.innerHTML = `<div class="page"><p class="error-text">${escapeHtml(err.message)}</p></div>`;
    }
  }
};
