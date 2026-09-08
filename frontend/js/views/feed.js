Views.feed = {
  async render(container) {
    container.innerHTML = `
      <div class="page feed-page">
        <div id="stories-bar" class="stories-bar"></div>
        <div class="create-post-card">
          <form id="create-post-form">
            <input name="imageUrl" placeholder="Image URL (e.g. https://picsum.photos/600)" required />
            <textarea name="caption" placeholder="Write a caption..."></textarea>
            <button type="submit" class="primary-btn">Share Post</button>
          </form>
          <p id="post-error" class="error-text"></p>
        </div>
        <div id="posts-list" class="posts-list">Loading feed...</div>
      </div>
    `;

    this.bindCreatePost(container);
    await this.loadStories(container);
    await this.loadFeed(container);
  },

  bindCreatePost(container) {
    container.querySelector('#create-post-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const imageUrl = formData.get('imageUrl');
      const caption = formData.get('caption');
      const errorEl = container.querySelector('#post-error');
      errorEl.textContent = '';
      try {
        await Api.createPost({ imageUrl, caption });
        e.target.reset();
        await this.loadFeed(container);
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
  },

  async loadStories(container) {
    const bar = container.querySelector('#stories-bar');
    try {
      const { stories } = await Api.getStories();
      const items = stories
        .map(
          (s) => `
            <div class="story-item">
              <img src="${escapeHtml(s.imageUrl)}" alt="story" />
            </div>`
        )
        .join('');
      bar.innerHTML = `
        <div class="story-item add-story" id="add-story-btn">+ Add Story</div>
        ${items}
      `;
      bar.querySelector('#add-story-btn').addEventListener('click', async () => {
        const imageUrl = prompt('Enter an image URL for your 24h story:');
        if (!imageUrl) return;
        await Api.createStory(imageUrl);
        await this.loadStories(container);
      });
    } catch (err) {
      bar.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
    }
  },

  async loadFeed(container) {
    const list = container.querySelector('#posts-list');
    try {
      const { posts } = await Api.getFeed();
      if (!posts.length) {
        list.innerHTML = '<p class="empty-state">No posts yet. Follow people or create your first post!</p>';
        return;
      }
      list.innerHTML = posts.map((p) => this.renderPost(p)).join('');
      this.bindPostActions(container, posts);
    } catch (err) {
      list.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
    }
  },

  renderPost(post) {
    const liked = State.currentUser && post.likes.includes(State.currentUser.id);
    return `
      <div class="post-card" data-post-id="${post.id}">
        <div class="post-header">
          <a href="#/profile/${escapeHtml(post.authorUsername)}" class="post-author">${escapeHtml(post.authorUsername)}</a>
        </div>
        <img class="post-image" src="${escapeHtml(post.imageUrl)}" alt="post" />
        <div class="post-actions">
          <button class="like-btn ${liked ? 'liked' : ''}" data-post-id="${post.id}">
            ${liked ? '♥' : '♡'} ${post.likesCount}
          </button>
          <span class="comment-count">💬 ${post.commentsCount}</span>
        </div>
        ${post.caption ? `<p class="post-caption">${escapeHtml(post.caption)}</p>` : ''}
        <div class="comments-list">
          ${post.comments
            .map((c) => `<p class="comment"><strong>${escapeHtml(c.authorUsername)}</strong> ${escapeHtml(c.text)}</p>`)
            .join('')}
        </div>
        <form class="comment-form" data-post-id="${post.id}">
          <input name="text" placeholder="Add a comment..." />
          <button type="submit">Post</button>
        </form>
      </div>
    `;
  },

  bindPostActions(container, posts) {
    container.querySelectorAll('.like-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const postId = btn.dataset.postId;
        const post = posts.find((p) => p.id === postId);
        const liked = State.currentUser && post.likes.includes(State.currentUser.id);
        try {
          if (liked) {
            await Api.unlikePost(postId);
          } else {
            await Api.likePost(postId);
          }
          await this.loadFeed(container);
        } catch (err) {
          alert(err.message);
        }
      });
    });

    container.querySelectorAll('.comment-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const postId = form.dataset.postId;
        const text = new FormData(form).get('text');
        if (!text) return;
        try {
          await Api.commentOnPost(postId, text);
          await this.loadFeed(container);
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }
};
