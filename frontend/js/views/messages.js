Views.messages = {
  async render(container, { userId }) {
    container.innerHTML = `
      <div class="page messages-page">
        <div class="conversations-list" id="conversations-list">Loading...</div>
        <div class="conversation-thread" id="conversation-thread">
          ${userId ? '' : '<p class="empty-state">Select a conversation to start chatting.</p>'}
        </div>
      </div>
    `;

    await this.loadConversations(container, userId);
    if (userId) {
      await this.loadThread(container, userId);
    }
  },

  async loadConversations(container, activeUserId) {
    const list = container.querySelector('#conversations-list');
    try {
      const { conversations } = await Api.getConversations();
      if (!conversations.length) {
        list.innerHTML = '<p class="empty-state">No conversations yet. Visit a profile to say hi!</p>';
        return;
      }
      list.innerHTML = conversations
        .map(
          (c) => `
          <a class="conversation-item ${c.partnerId === activeUserId ? 'active' : ''}" href="#/messages/${c.partnerId}">
            <strong>${escapeHtml(c.partnerUsername)}</strong>
            <p>${escapeHtml(c.lastMessage.text)}</p>
          </a>`
        )
        .join('');
    } catch (err) {
      list.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
    }
  },

  async loadThread(container, userId) {
    const thread = container.querySelector('#conversation-thread');
    thread.innerHTML = 'Loading conversation...';
    try {
      const { messages } = await Api.getMessages(userId);
      thread.innerHTML = `
        <div class="messages-scroll">
          ${messages
            .map(
              (m) => `
              <div class="message-bubble ${m.senderId === State.currentUser.id ? 'sent' : 'received'}">
                ${escapeHtml(m.text)}
              </div>`
            )
            .join('') || '<p class="empty-state">No messages yet. Say hello!</p>'}
        </div>
        <form id="message-form">
          <input name="text" placeholder="Type a message..." autocomplete="off" />
          <button type="submit">Send</button>
        </form>
      `;

      thread.querySelector('#message-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = new FormData(e.target).get('text');
        if (!text) return;
        try {
          await Api.sendMessage(userId, text);
          e.target.reset();
          await this.loadThread(container, userId);
          await this.loadConversations(container, userId);
        } catch (err) {
          alert(err.message);
        }
      });
    } catch (err) {
      thread.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
    }
  }
};
