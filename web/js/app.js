const routes = {
  "/register": RegisterPage,
  "/login": LoginPage,
  "/": HomePage,
  "/profile": ProfilePage
};

const publicRoutes = ["/login", "/register"]

const App = {
  data() {
    return {
      isChatSidebarOpen: false,
      activeChatUser: null,
      postRefreshTick: 0,
      chatInitialized: false,
    };
  },

  computed: {
    CurrentComponent() {
      return routes[window.Router.state.path]
    },
    showNavbar() {
      return !publicRoutes.includes(window.Router.state.path)
    },
    routeKey() {
      return window.Router.state.path + window.Router.state.query;
    }
  },

  mounted() {
    window.addEventListener("chat-reset", () => {
      this.chatInitialized = false;
    });

    this.ensureChatInit();
  },
  watch: {
    showNavbar() {
      this.ensureChatInit();
    }
  },
  
  methods: {
    // ensureChatInit starts the chat service once the app is on a
    // private/authenticated route. This allows websocket chat to come
    // online after SPA login without requiring a full page refresh.
    async ensureChatInit() {
      if (!this.showNavbar) return;
      if (this.chatInitialized && window.MockChat.isConnected()) return;
    
      try {
        await window.MockChat.init();
        this.chatInitialized = true;
      } catch (err) {
        console.error("chat init failed", err);
      }
    },
    toggleChatSidebar() {
      this.isChatSidebarOpen = !this.isChatSidebarOpen;
    },
    openChatWithUser(user) {
      this.activeChatUser = user;
    },
    closeChatBox() {
      this.activeChatUser = null;
    },
    onPostCreated() {
      this.postRefreshTick++;
    }
  },

  template: `
    <Navbar
      v-if="showNavbar"
      @toggle-chat="toggleChatSidebar"
      @post-created="onPostCreated"
    />
    <component
      :is="CurrentComponent"
      :key="routeKey"
      :postRefreshTick="postRefreshTick"
    ></component>
    <template v-if="showNavbar">
      <ChatSidebar
        :isOpen="isChatSidebarOpen"
        @close="isChatSidebarOpen = false"
        @select-user="openChatWithUser"
      />
      <ChatBox
        v-if="activeChatUser"
        :user="activeChatUser"
        @close="closeChatBox"
      />
    </template>
  `
};

const app = Vue.createApp(App);

app.component("Navbar", Navbar);
app.component("ChatSidebar", ChatSidebar);
app.component("ChatBox", ChatBox);
app.component("CommentSection", CommentSection);

app.mount("#app");
