window.ChatBox = {
  name: "ChatBox",

  props: {
    user: {
      type: Object,
      required: true
    }
  },

  emits: ["close"],

  data() {
    return {
      messages: [],
      newMessage: "",
      minimized: false
    };
  },

  mounted() {
    this.loadMessages();
  },

  watch: {
    user: {
      immediate: true,
      handler() {
        this.loadMessages();
      }
    }
  },

  methods: {
    loadMessages() {
      if (!this.user) return;
      this.messages = MockChat.getMessages(this.user.id);
    },

    sendMessage() {
      const text = this.newMessage.trim();
      if (!text) return;

      MockChat.sendMessage(this.user.id, text);
      this.messages = MockChat.getMessages(this.user.id);
      this.newMessage = "";
    },

    toggleMinimize() {
      this.minimized = !this.minimized;
    }
  },

  template: `
    <div class="chat-box" :class="{ minimized: minimized }">
      <div class="chat-box-header">
        <div class="chat-box-user">
          <strong>{{ user.name }}</strong>
        </div>
        <button class="chat-minimize-btn" @click="toggleMinimize">_</button>
        <button class="chat-close-btn" @click="$emit('close')">✕</button>
      </div>

      <div v-if="!minimized" class="chat-box-messages">
        <div
          v-for="message in messages"
          :key="message.id"
          class="chat-message"
          :class="{ mine: message.fromMe }"
        >
          {{ message.text }}
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
        <button class="chat-send-btn" @click="sendMessage">Send</button>
      </div>
    </div>
  `
};