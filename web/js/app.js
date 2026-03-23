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

  methods: {
    toggleChatSidebar() {
      this.isChatSidebarOpen = !this.isChatSidebarOpen;
    },
    closeChatSidebar() {
      this.isChatSidebarOpen = false;
    },
    openChatWithUser(user) {
      this.activeChatUser = user;
    },
    closeChatBox() {
      this.activeChatUser = null;
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

  mounted() {
    document.addEventListener("click", this.handleDocumentClick, true);
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
