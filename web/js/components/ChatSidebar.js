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
      users: []
    };
  },

  mounted() {
    this.users = MockChat.getUsers();
  },

  template: `
    <aside class="chat-sidebar" :class="{ open: isOpen }" @click.stop>
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