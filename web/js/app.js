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

app.mount("#app");
