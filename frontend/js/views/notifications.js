const NOTIFICATION_TEXT = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  message: 'sent you a message'
};

Views.notifications = {
  async render(container) {
    container.innerHTML = '<div class="page notifications-page">Loading notifications...</div>';
    try {
      const { notifications } = await Api.getNotifications();
      const page = container.querySelector('.notifications-page');
      if (!notifications.length) {
        page.innerHTML = '<p class="empty-state">No notifications yet.</p>';
        return;
      }
      page.innerHTML = `
        <button id="mark-all-read">Mark all as read</button>
        <div class="notifications-list">
          ${notifications
            .map(
              (n) => `
              <div class="notification-item ${n.read ? '' : 'unread'}">
                <strong>${escapeHtml(n.actorUsername)}</strong>
                ${NOTIFICATION_TEXT[n.type] || 'sent a notification'}
              </div>`
            )
            .join('')}
        </div>
      `;
      page.querySelector('#mark-all-read').addEventListener('click', async () => {
        await Api.markAllNotificationsRead();
        await this.render(container);
      });
    } catch (err) {
      container.innerHTML = `<div class="page"><p class="error-text">${escapeHtml(err.message)}</p></div>`;
    }
  }
};
