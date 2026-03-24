window.ChatSidebar = {
  name: "ChatSidebar",

  props: {
    isOpen: {
      type: Boolean,
      required: true
    }
  },

  data() {
    return {
      users: [],
      unsubscribeChat: null,
      unsubscribeFollowChanged: null
    };
  },

  methods: {
    openConversation(user) {
      window.Events.chat.openUser(user);
      window.Events.chat.closeSidebar();
    },

    async refreshUsers() {
      try {
        this.users = await window.MockChat.refreshUsers();
      } catch (err) {
        console.error("failed to refresh chat users", err);
      }
    }
  },

  async mounted() {
    try {
      this.users = await window.MockChat.getUsers();
    } catch (err) {
      console.error("failed to load chat users", err);
      this.users = [];
    }

    this.unsubscribeChat = window.MockChat.subscribe(async (event) => {
      if (
        event.type === "presence" ||
        event.type === "presence_snapshot" ||
        event.type === "message_received" ||
        event.type === "message_sent" ||
        event.type === "conversation_read" ||
        event.type === "users_updated"
      ) {
        this.users = window.MockChat.getUsersSync();
        return;
      }

      if (event.type === "relationship_changed") {
        await this.refreshUsers();
      }
    });

    this.unsubscribeFollowChanged = window.Events.on(
      window.Events.EVENT.PROFILE_FOLLOW_CHANGED,
      async () => {
        await this.refreshUsers();
      }
    );
  },

  beforeUnmount() {
    if (this.unsubscribeChat) {
      this.unsubscribeChat();
      this.unsubscribeChat = null;
    }

    if (this.unsubscribeFollowChanged) {
      this.unsubscribeFollowChanged();
      this.unsubscribeFollowChanged = null;
    }
  },

  template: `
    <aside class="chat-sidebar" :class="{ open: isOpen }" @click.stop>
      <div class="chat-sidebar-header">
        <h3>Chats</h3>
        <button class="chat-close-btn" @click="window.Events.chat.closeSidebar()">✕</button>
      </div>

      <div class="chat-user-list">
        <button
          v-for="user in users"
          :key="user.id"
          class="chat-user-item"
          @click="openConversation(user)"
        >
          <div class="chat-user-avatar">
            {{ user.name.charAt(0) }}
            <span class="chat-user-status" :class="{ online: user.online }"></span>
          </div>

          <div class="chat-user-info">
            <div class="chat-user-name-row">
              <div class="chat-user-name">{{ user.name }}</div>
              <span
                v-if="user.unreadCount > 0"
                class="chat-unread-badge"
              >
                {{ user.unreadCount }}
              </span>
            </div>

            <div class="chat-user-presence">
              {{ user.online ? "Online" : "Offline" }}
            </div>
          </div>
        </button>
      </div>
    </aside>
  `
};