window.ChatBox = {
  name: "ChatBox",

  props: {
    user: {
      type: Object,
      required: true
    }
  },

  computed: {
    sidebarOpen() {
      return window.Events.state.chat.sidebarOpen;
    }
  },
  
  data() {
    return {
      messages: [],
      newMessage: "",
      minimized: false,
      unsubscribe: null
    };
  },

  watch: {
    user: {
      immediate: true,
      handler() {
        if (this.user) {
          this.minimized = window.Events.state.chat.boxMinimized;
          this.loadMessages();
        }
      }
    }
  },

  mounted() {
    if (this.user) {
      this.minimized = window.Events.state.chat.boxMinimized;
    }

    this.unsubscribe = window.MockChat.subscribe((event) => {
      if (!this.user) return;

      if (
        (event.type === "message_sent" || event.type === "message_received") &&
        event.userId === this.user.id
      ) {
        this.messages = window.MockChat.getMessages(this.user.id);

        this.$nextTick(() => {
          this.scrollToBottom();
        });

        if (
          event.type === "message_received" &&
          !this.minimized &&
          event.message &&
          !event.message.fromMe
        ) {
          window.MockChat.markRead(event.message.id);
        }
      }

      if (
        event.type === "conversation_read" &&
        event.userId === this.user.id
      ) {
        this.messages = window.MockChat.getMessages(this.user.id);
      }

      if (event.type === "message_status") {
        this.messages = window.MockChat.getMessages(this.user.id);
      }
    });
  },

  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  },

  methods: {
    async loadMessages() {
      if (!this.user) return;

      try {
        this.messages = await window.MockChat.loadConversation(this.user.id);

        this.$nextTick(() => {
          this.scrollToBottom();
        });
      } catch (err) {
        console.error("failed to load messages", err);
        this.messages = [];
      }
    },

    scrollToBottom() {
      const box = this.$refs.messagesBox;
      if (!box) return;

      box.scrollTop = box.scrollHeight;
    },

    sendMessage() {
      const text = this.newMessage.trim();
      if (!text) return;

      try {
        window.MockChat.sendMessage(this.user.id, text);
        this.newMessage = "";
      } catch (err) {
        console.error("failed to send message", err);
      }
    },

    toggleMinimize() {
      this.minimized = !this.minimized;
      window.Events.chat.setMinimized(this.minimized);
    },

    closeBox() {
      window.Events.chat.closeBox();
    },

    isLastOutgoing(message) {
      const outgoing = this.messages.filter(msg => msg.fromMe);
      if (!outgoing.length) return false;
      return outgoing[outgoing.length - 1].id === message.id;
    },

    messageStatus(message) {
      if (!message.fromMe) return "";

      if (message.readAt && message.readAt > 0) {
        return "Read";
      }

      if (message.receivedAt && message.receivedAt > 0) {
        return "Delivered";
      }

      return "Sent";
    }
  },

  template: `
    <div class="chat-box" 
        :class="{ 
          minimized: minimized,
          'chat-box-with-sidebar': sidebarOpen,
          'chat-box-without-sidebar': !sidebarOpen
        }"
      >
      <div class="chat-box-header" @click.self="toggleMinimize">
        <div class="chat-box-user">
          <div class="chat-box-avatar">
            <img v-if="user.avatar" :src="user.avatar" :alt="user.name" class="chat-user-avatar-img" />
            <span v-else class="chat-user-avatar-initial">{{ user.name.charAt(0) }}</span>
            <span class="chat-user-status" :class="{ online: user.online }"></span>
          </div>
          <div class="chat-box-user-info">
            <strong>{{ user.name }}</strong>
            <span class="chat-box-presence">{{ user.online ? "Online" : "Offline" }}</span>
          </div>
        </div>
        <div class="chat-box-controls">
          <button class="chat-minimize-btn" @click="toggleMinimize">
            <span class="material-symbols-outlined">remove</span>
          </button>
          <button class="chat-close-btn" @click="closeBox">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div
        v-if="!minimized"
        ref="messagesBox"
        class="chat-box-messages"
      >
        <div
          v-for="message in messages"
          :key="message.id"
          class="chat-message-wrapper"
          :class="{ mine: message.fromMe }"
        >
          <div
            class="chat-message"
            :class="{ mine: message.fromMe }"
          >
            {{ message.text }}
          </div>

          <div
            v-if="message.fromMe && isLastOutgoing(message)"
            class="chat-message-status"
          >
            {{ messageStatus(message) }}
          </div>
        </div>
      </div>

      <div v-if="!minimized" class="chat-box-input-area">
        <input
          v-model="newMessage"
          type="text"
          placeholder="Type a message..."
          class="chat-box-input"
          @keyup.enter="sendMessage"
        />
        <button class="chat-send-btn" @click="sendMessage">
          <span class="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  `
};