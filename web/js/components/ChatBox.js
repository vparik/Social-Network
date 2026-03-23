// ChatBox renders a private conversation with the selected user.
//
// It loads persisted message history when opened, listens for live websocket
// updates through the chat service, and sends new messages in real time.
//
// Current behavior:
// - loads conversation history from the backend
// - updates instantly on incoming and outgoing chat events
// - marks visible incoming messages as read when appropriate
// - shows delivery and read status for the latest outgoing message
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
      minimized: false,
      unsubscribe: null
    };
  },

  mounted() {
    this.unsubscribe = window.MockChat.subscribe((event) => {
      if (!this.user) return;

      if (
        (event.type === "message_sent" || event.type === "message_received") &&
        event.userId === this.user.id
      ) {
        this.messages = window.MockChat.getMessages(this.user.id);
      
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

    this.loadMessages();
  },

  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
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
    async loadMessages() {
      if (!this.user) return;

      try {
        this.messages = await window.MockChat.loadConversation(this.user.id);
      } catch (err) {
        console.error("failed to load messages", err);
        this.messages = [];
      }
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
        <button class="chat-send-btn" @click="sendMessage">Send</button>
      </div>
    </div>
  `
};