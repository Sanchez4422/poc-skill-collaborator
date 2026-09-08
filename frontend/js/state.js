// Minimal global state shared across views.
const State = {
  currentUser: null,
  listeners: [],

  setCurrentUser(user) {
    this.currentUser = user;
  },

  subscribe(fn) {
    this.listeners.push(fn);
  },

  notify() {
    this.listeners.forEach((fn) => fn());
  }
};
