// Events is the app-wide coordination layer for shared SPA state and
// cross-component communication.
//
// Use it for:
// - shared reactive state that multiple components need
// - app-wide events that should not rely on parent/child emit chains
// - central route/chat/auth state changes
//
// Public usage rules:
//
// 1. Read shared state from Events.state
//    Example:
//      window.Events.state.chat.sidebarOpen
//      window.Events.state.auth.currentUser
//      window.Events.state.route.path
//
// 2. Subscribe to app-wide events with Events.on(...)
//    Example:
//      const unsubscribe = window.Events.on(
//        window.Events.EVENT.POSTS_CREATED,
//        (post) => { ... }
//      )
//
// 3. Use Events.route.*, Events.chat.* and Events.auth.* to mutate shared state
//    Example:
//      window.Events.route.setCurrent("/profile", "?id=3", "push")
//      window.Events.chat.openSidebar()
//      window.Events.chat.openUser(user)
//      window.Events.chat.closeBox()
//      window.Events.auth.setCurrentUser(user)
//
// 4. Use Events.emit(...) for domain events after a successful action
//    when other parts of the app may need to react
//    Example:
//      window.Events.emit(window.Events.EVENT.POSTS_CREATED, createdPost)
//      window.Events.emit(window.Events.EVENT.POSTS_DELETED, { postId })
//      window.Events.emit(window.Events.EVENT.COMMENTS_CREATED, { postId, comment })
//
// Avoid:
// - direct mutation of Events.state from components
// - raw window custom events for app coordination
// - cross-page/component relay emits for global actions
// - adding unrelated local UI state here unless it is truly shared
//
// Rule of thumb:
// - local parent/child UI -> normal Vue props/emits
// - app-wide shared flow -> Events
window.Events = (function () {
  const listeners = new Map();

  const EVENT = Object.freeze({
    ROUTE_CHANGED: "route:changed",

    CHAT_RESET: "chat:reset",
    CHAT_SIDEBAR_OPENED: "chat:sidebar-opened",
    CHAT_SIDEBAR_CLOSED: "chat:sidebar-closed",
    CHAT_USER_OPENED: "chat:user-opened",
    CHAT_BOX_CLOSED: "chat:box-closed",
    CHAT_BOX_MINIMIZED: "chat:box-minimized",
    CHAT_BOX_RESTORED: "chat:box-restored",

    POSTS_CREATED: "posts:created",
    POSTS_DELETED: "posts:deleted",

    COMMENTS_CREATED: "comments:created",

    PROFILE_FOLLOW_CHANGED: "profile:follow-changed",
    PROFILE_PRIVACY_CHANGED: "profile:privacy-changed",

    NOTIFICATIONS_UPDATED: "notifications:updated",
    
    AUTH_USER_READY: "auth:user-ready",
    AUTH_LOGOUT: "auth:logout"
  });

  const state = Vue.reactive({
    auth: {
      currentUser: null,
      status: "unknown"
    },
    route: {
      path: window.location.pathname,
      query: window.location.search
    },
    chat: {
      initialized: false,
      sidebarOpen: false,
      activeUser: null,
      boxMinimized: false
    }
  });

  function on(eventName, handler) {
    if (typeof handler !== "function") {
      throw new Error("Events.on requires a function handler");
    }

    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }

    listeners.get(eventName).add(handler);

    return function unsubscribe() {
      off(eventName, handler);
    };
  }

  function off(eventName, handler) {
    const handlers = listeners.get(eventName);
    if (!handlers) return;

    handlers.delete(handler);

    if (handlers.size === 0) {
      listeners.delete(eventName);
    }
  }

  function emit(eventName, payload) {
    const handlers = listeners.get(eventName);
    if (!handlers || handlers.size === 0) return;

    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`Events handler failed for "${eventName}"`, err);
      }
    }
  }

  function getState(path) {
    const parts = path.split(".");
    let target = state;

    for (const part of parts) {
      if (target == null) return undefined;
      target = target[part];
    }

    return target;
  }

  function setState(path, value) {
    const parts = path.split(".");
    let target = state;

    for (let i = 0; i < parts.length - 1; i++) {
      if (target == null) return;
      target = target[parts[i]];
    }

    if (target == null) return;
    target[parts[parts.length - 1]] = value;
  }

  const route = {
    setCurrent(path, query, mode) {
      setState("route.path", path || state.route.path);
      setState("route.query", query || "");

      emit(EVENT.ROUTE_CHANGED, {
        mode: mode || "unknown",
        path: getState("route.path"),
        query: getState("route.query"),
        fullPath: getState("route.path") + getState("route.query")
      });
    }
  };

  const chat = {
    markInitialized(value) {
      setState("chat.initialized", !!value);
    },

    openSidebar() {
      if (getState("chat.sidebarOpen")) return;

      setState("chat.sidebarOpen", true);
      emit(EVENT.CHAT_SIDEBAR_OPENED, { open: true });
    },

    closeSidebar() {
      if (!getState("chat.sidebarOpen")) return;

      setState("chat.sidebarOpen", false);
      emit(EVENT.CHAT_SIDEBAR_CLOSED, { open: false });
    },

    toggleSidebar() {
      if (getState("chat.sidebarOpen")) {
        chat.closeSidebar();
      } else {
        chat.openSidebar();
      }
    },

    openUser(user) {
      setState("chat.activeUser", user || null);
      setState("chat.boxMinimized", false);
      emit(EVENT.CHAT_USER_OPENED, { user: getState("chat.activeUser") });
    },

    closeBox() {
      setState("chat.activeUser", null);
      setState("chat.boxMinimized", false);
      emit(EVENT.CHAT_BOX_CLOSED, {});
    },

    setMinimized(minimized) {
      setState("chat.boxMinimized", !!minimized);

      if (getState("chat.boxMinimized")) {
        emit(EVENT.CHAT_BOX_MINIMIZED, { minimized: true });
      } else {
        emit(EVENT.CHAT_BOX_RESTORED, { minimized: false });
      }
    },

    reset() {
      setState("chat.initialized", false);
      setState("chat.sidebarOpen", false);
      setState("chat.activeUser", null);
      setState("chat.boxMinimized", false);
      emit(EVENT.CHAT_RESET, {});
    }
  };

  const auth = {
    setCurrentUser(user) {
      setState("auth.currentUser", user || null);
      setState("auth.status", user ? "authenticated" : "guest");
      emit(EVENT.AUTH_USER_READY, { user: getState("auth.currentUser") });
    },

    clearCurrentUser() {
      setState("auth.currentUser", null);
      setState("auth.status", "guest");
      emit(EVENT.AUTH_LOGOUT, {});
    },

    markGuest() {
      setState("auth.currentUser", null);
      setState("auth.status", "guest");
    }
  };

  return {
    EVENT,
    state,
    on,
    off,
    emit,
    route,
    chat,
    auth
  };
})();