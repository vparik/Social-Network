// ChatSidebar displays the available private chat users.
//
// It loads the initial user list from the chat service, then keeps the
// sidebar presence state in sync through chat websocket events.
//
// Current behavior:
// - initial user list comes from the backend
// - after websocket open, users are refreshed once from the backend
// - live online/offline changes are applied from the local chat cache
// - selecting a user opens the private chat box for that user
window.ChatSidebar = {
  name: "ChatSidebar",

  props: {
    isOpen: {
      type: Boolean,
      required: true
    }
  },

  emits: ["close", "select-user"],

  data() {
    return {
      users: [],
      unsubscribe: null
    };
  },

  async mounted() {
    try {
      this.users = await MockChat.getUsers();
    } catch (err) {
      console.error("failed to load chat users", err);
      this.users = [];
    }

    this.unsubscribe = MockChat.subscribe(async (event) => {
      if (event.type === "ws_open") {
        try {
          this.users = await MockChat.refreshUsers();
        } catch (err) {
          console.error("failed to refresh chat users", err);
        }
        return;
      }

      if (event.type === "presence" || event.type === "presence_snapshot") {
        this.users = MockChat.getUsersSync();
      }
    });
  },

  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  },

  template: `
    <aside class="chat-sidebar" :class="{ open: isOpen }">
      <div class="chat-sidebar-header">
        <h3>Chats</h3>
        <button class="chat-close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="chat-user-list">
        <button
          v-for="user in users"
          :key="user.id"
          class="chat-user-item"
          @click="$emit('select-user', user)"
        >
          <div class="chat-user-avatar">
            {{ user.name.charAt(0) }}
            <span class="chat-user-status" :class="{ online: user.online }"></span>
          </div>

          <div class="chat-user-info">
            <div class="chat-user-name">{{ user.name }}</div>
            <div class="chat-user-presence">
              {{ user.online ? "Online" : "Offline" }}
            </div>
          </div>
        </button>
      </div>
    </aside>
  `
};