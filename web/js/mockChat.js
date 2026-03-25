window.MockChat = (function () {
  let listeners = [];
  let conversations = {};
  let users = [];
  let currentUserId = null;
  let realtimeBound = false;

  function notify(event) {
    listeners.forEach(fn => fn(event));
  }

  function normalizeMessage(message) {
    return {
      id: message.id,
      fromMe: message.senderId === currentUserId,
      text: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      sentAt: message.sentAt,
      receivedAt: message.receivedAt,
      readAt: message.readAt
    };
  }

  function upsertMessage(rawMessage) {
    const otherUserId =
      rawMessage.senderId === currentUserId
        ? rawMessage.receiverId
        : rawMessage.senderId;

    if (!conversations[otherUserId]) {
      conversations[otherUserId] = [];
    }

    const normalized = normalizeMessage(rawMessage);
    const idx = conversations[otherUserId].findIndex(m => m.id === normalized.id);

    if (idx === -1) {
      conversations[otherUserId].push(normalized);
    } else {
      conversations[otherUserId][idx] = normalized;
    }

    conversations[otherUserId].sort((a, b) => {
      if (a.sentAt !== b.sentAt) return a.sentAt - b.sentAt;
      return a.id - b.id;
    });

    return { otherUserId, message: normalized };
  }

  async function fetchCurrentUser() {
    const existing = window.Events?.state?.auth?.currentUser;

    if (existing && existing.id) {
      currentUserId = existing.id;
      return currentUserId;
    }

    return await new Promise((resolve, reject) => {
      if (!window.Events) {
        reject(new Error("events_not_available"));
        return;
      }

      const unsubscribe = window.Events.on(
        window.Events.EVENT.AUTH_USER_READY,
        ({ user }) => {
          if (!user || !user.id) {
            unsubscribe();
            reject(new Error("failed_to_load_current_user"));
            return;
          }

          currentUserId = user.id;
          unsubscribe();
          resolve(currentUserId);
        }
      );
    });
  }

  async function fetchUsers() {
    const res = await fetch("/api/chat/users", {
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error("failed_to_load_chat_users");
    }

    const data = await res.json();
    users = Array.isArray(data) ? data : [];
    return [...users];
  }

  function bindRealtime() {
    if (realtimeBound) return;
    realtimeBound = true;

    window.WS.subscribe((event) => {
      switch (event.type) {
        case "ws_open": {
          notify({ type: "ws_open" });
          break;
        }

        case "ws_close": {
          notify({ type: "ws_close" });
          break;
        }

        case "ws_error": {
          notify({ type: "ws_error" });
          break;
        }

        case "relationship_changed": {
          notify({
            type: "relationship_changed",
            data: event.data
          });
          break;
        }

        case "presence": {
          const data = event.data || {};

          users = users.map(user => {
            if (user.id === data.userId) {
              return { ...user, online: data.online };
            }
            return user;
          });

          notify({
            type: "presence",
            userId: data.userId,
            online: data.online
          });
          break;
        }

        case "presence_snapshot": {
          const data = event.data || {};
          const onlineSet = new Set(data.userIds || []);

          users = users.map(user => ({
            ...user,
            online: onlineSet.has(user.id)
          }));

          notify({
            type: "presence_snapshot",
            userIds: data.userIds || []
          });
          break;
        }

        case "message_sent":
        case "message_received": {
          const result = upsertMessage(event.data);

          if (
            event.type === "message_received" &&
            result.message &&
            !result.message.fromMe &&
            !isChatOpenWith(result.otherUserId)
          ) {
            incrementUnread(result.otherUserId);
          }

          notify({
            type: event.type,
            userId: result.otherUserId,
            message: result.message
          });
          break;
        }

        case "message_status": {
          const status = event.data || {};

          Object.keys(conversations).forEach(userId => {
            const list = conversations[userId];
            const found = list.find(m => m.id === status.messageId);
            if (!found) return;

            if (status.status === "received" && !found.receivedAt) {
              found.receivedAt = Math.floor(Date.now() / 1000);
            }

            if (status.status === "read" && !found.readAt) {
              found.readAt = Math.floor(Date.now() / 1000);
            }
          });

          notify({
            type: "message_status",
            data: status
          });
          break;
        }

        case "conversation_read": {
          const data = event.data || {};
          const userId = data.userId;

          if (conversations[userId]) {
            conversations[userId] = conversations[userId].map(msg => {
              if (data.messageIds.includes(msg.id)) {
                return { ...msg, readAt: data.readAt };
              }
              return msg;
            });
          }

          notify({
            type: "conversation_read",
            userId,
            data
          });
          break;
        }
      }
    });
  }

  async function init() {
    bindRealtime();

    if (!currentUserId) {
      await fetchCurrentUser();
    }

    await fetchUsers();

    if (window.WS.isConnected()) {
      return;
    }

    await new Promise((resolve, reject) => {
      window.WS.connect();

      if (window.WS.isConnected()) {
        resolve();
        return;
      }

      let done = false;

      const unsubscribe = subscribe((event) => {
        if (done) return;

        if (event.type === "ws_open") {
          done = true;
          unsubscribe();
          resolve();
        }

        if (event.type === "ws_error") {
          done = true;
          unsubscribe();
          reject(new Error("ws_open_failed"));
        }
      });

      setTimeout(() => {
        if (done) return;
        done = true;
        unsubscribe();
        reject(new Error("ws_open_timeout"));
      }, 5000);
    });
  }

  async function loadConversation(userId) {
    const res = await fetch(`/api/messages?userId=${encodeURIComponent(userId)}`, {
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error("failed_to_load_messages");
    }

    const data = await res.json();
    conversations[userId] = Array.isArray(data) ? data.map(normalizeMessage) : [];
    setUnreadCount(userId, 0);

    notify({
      type: "users_updated"
    });

    return [...conversations[userId]];
  }

  function getMessages(userId) {
    return conversations[userId] ? [...conversations[userId]] : [];
  }

  async function getUsers() {
    if (!users.length) {
      await fetchUsers();
    }
    return [...users];
  }

  function getUsersSync() {
    return [...users];
  }

  async function refreshUsers() {
    const refreshed = await fetchUsers();

    notify({
      type: "users_updated"
    });

    return refreshed;
  }

  function sendMessage(userId, text) {
    window.WS.send("send_message", {
      receiverId: userId,
      content: text
    });
  }

  function markRead(messageId) {
    if (!window.WS.isConnected()) {
      return;
    }

    window.WS.send("mark_read", {
      messageId
    });
  }

  function isChatOpenWith(userId) {
    const chatState = window.Events?.state?.chat;

    if (!chatState || !chatState.activeUser) {
      return false;
    }

    return (
      chatState.activeUser.id === userId &&
      chatState.boxMinimized === false
    );
  }

  function updateUser(userId, updater) {
    users = users.map(user => {
      if (user.id !== userId) return user;
      return updater(user);
    });
  }

  function setUnreadCount(userId, count) {
    updateUser(userId, user => ({
      ...user,
      unreadCount: Math.max(0, count)
    }));
  }

  function incrementUnread(userId) {
    updateUser(userId, user => ({
      ...user,
      unreadCount: (user.unreadCount || 0) + 1
    }));
  }

  function subscribe(fn) {
    listeners.push(fn);

    return function unsubscribe() {
      listeners = listeners.filter(x => x !== fn);
    };
  }

  function getTotalUnreadCount() {
    return users.reduce((sum, user) => sum + (user.unreadCount || 0), 0);
  }

  function isConnected() {
    return window.WS.isConnected();
  }

  function getCurrentUserId() {
    return currentUserId;
  }

  function connect() {
    window.WS.connect();
  }

  function disconnect() {
    window.WS.disconnect();
  }

  return {
    init,
    connect,
    disconnect,
    subscribe,
    getUsers,
    getUsersSync,
    refreshUsers,
    getMessages,
    loadConversation,
    sendMessage,
    markRead,
    isConnected,
    getCurrentUserId,
    getTotalUnreadCount
  };
})();