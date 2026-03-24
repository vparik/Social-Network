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
      chatBoxMinimized: false,
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
    window.__chatState = {
      activeChatUserId: null,
      chatBoxMinimized: false
    };
    this.ensureChatInit();
    document.addEventListener("click", this.handleDocumentClick, true);
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
    closeChatSidebar() {
      this.isChatSidebarOpen = false;
    },
    openChatWithUser(user) {
      this.activeChatUser = user;
      window.__chatState.activeChatUserId = user.id;
      window.__chatState.chatBoxMinimized = false;
    },

    closeChatBox() {
      this.activeChatUser = null;
      window.__chatState.activeChatUserId = null;
      window.__chatState.chatBoxMinimized = false;
    },
    onPostCreated() {
      this.postRefreshTick++;
    },

    handleDocumentClick(event) {
     if (!this.isChatSidebarOpen) return;

      const navbarComponent = this.$refs.navbar;
      const chatSidebarComponent = this.$refs.chatSidebar;

      const clickedChatButton =
        navbarComponent &&
        typeof navbarComponent.isChatButtonTarget === "function" &&
        navbarComponent.isChatButtonTarget(event.target);

      const clickedInsideSidebar =
        chatSidebarComponent &&
        chatSidebarComponent.$el &&
        chatSidebarComponent.$el.contains(event.target);

      if (!clickedChatButton && !clickedInsideSidebar) {
        this.isChatSidebarOpen = false;
      }
    }
  },

  beforeUnmount() {
    document.removeEventListener("click", this.handleDocumentClick, true);
  },

  template: `
    <Navbar
      v-if="showNavbar"
      ref="navbar"
      @toggle-chat="toggleChatSidebar"
      @close-chat="closeChatSidebar"
      @post-created="onPostCreated"
    />
    <component
      :is="CurrentComponent"
      :key="routeKey"
      :postRefreshTick="postRefreshTick"
    ></component>
    <template v-if="showNavbar">
      <ChatSidebar
        ref="chatSidebar"
        :isOpen="isChatSidebarOpen"
        @close="isChatSidebarOpen = false"
        @select-user="openChatWithUser"
      />
      <ChatBox
        v-if="activeChatUser"
        :user="activeChatUser"
        @close="closeChatBox"
        @minimize-change="chatBoxMinimized = $event; window.__chatState.chatBoxMinimized = $event"
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
