const routes = {
  "/register": RegisterPage,
  "/login": LoginPage,
  "/": HomePage,
  "/profile": ProfilePage
};

const publicRoutes = ["/login", "/register"];

const App = {
  computed: {
    routeState() {
      return window.Events.state.route;
    },

    chatState() {
      return window.Events.state.chat;
    },

    authState() {
      return window.Events.state.auth;
    },

    isPublicRoute() {
      return publicRoutes.includes(this.routeState.path);
    },

    showNavbar() {
      return !this.isPublicRoute && this.authState.status === "authenticated";
    },

    CurrentComponent() {
      return routes[this.routeState.path] || null;
    },

    routeKey() {
      return this.routeState.path + this.routeState.query;
    },

    canRenderCurrentRoute() {
      if (this.isPublicRoute) return true;
      return this.authState.status !== "unknown";
    }
  },

  async mounted() {
    this.bindRealtimePosts();
    await this.bootstrapAuth();
    await this.ensureChatInit();
    document.addEventListener("click", this.handleDocumentClick, true);
  },

  watch: {
    "routeState.path"() {
      this.bootstrapAuth();
      this.ensureChatInit();
    },

    "authState.status"() {
      this.ensureChatInit();
    },

    "authState.currentUser"() {
      this.ensureChatInit();
    }
  },

  methods: {
    bindRealtimePosts() {
      if (this._unsubscribeRealtimePosts) return;

      this._unsubscribeRealtimePosts = window.WS.subscribe((event) => {
        switch (event.type) {
          case "post_created":
            if (!event.data || !event.data.id) return;
            window.Events.emit(window.Events.EVENT.POSTS_CREATED, event.data);
            break;

          case "post_deleted":
            if (!event.data || !event.data.postId) return;
            window.Events.emit(window.Events.EVENT.POSTS_DELETED, {
              postId: event.data.postId
            });
            break;
        }
      });
    },
    async bootstrapAuth() {
      if (this.isPublicRoute) return;
      if (this.authState.status !== "unknown") return;

      try {
        const res = await fetch("/api/profile", { method: "GET" });

        if (!res.ok) {
          window.Events.auth.markGuest();
          window.Router.replace("/login");
          return;
        }

        const user = await res.json();
        window.currentUser = user;
        window.Events.auth.setCurrentUser(user);
      } catch (err) {
        window.Events.auth.markGuest();
        window.Router.replace("/login");
      }
    },

    async ensureChatInit() {
      if (this.isPublicRoute) return;
      if (this.authState.status !== "authenticated") return;
      if (!this.authState.currentUser || !this.authState.currentUser.id) return;

      if (this.chatState.initialized && window.MockChat.isConnected()) {
        return;
      }

      try {
        await window.MockChat.init();
        window.Events.chat.markInitialized(true);
      } catch (err) {
        console.error("chat init failed", err);
      }
    },

    handleDocumentClick(event) {
      if (!this.chatState.sidebarOpen) return;

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
        window.Events.chat.closeSidebar();
      }
    }
  },

  beforeUnmount() {
    document.removeEventListener("click", this.handleDocumentClick, true);
    if (this._unsubscribeRealtimePosts) {
      this._unsubscribeRealtimePosts();
      this._unsubscribeRealtimePosts = null;
    }
  },

  template: `
    <Navbar
      v-if="showNavbar"
      ref="navbar"
    />

    <div v-if="!CurrentComponent" class="container error">
      Page not found.
    </div>

    <div v-else-if="!canRenderCurrentRoute" class="container">
      Loading...
    </div>

    <component
      v-else
      :is="CurrentComponent"
      :key="routeKey"
    ></component>

    <template v-if="showNavbar">
      <ChatSidebar
        ref="chatSidebar"
        :isOpen="chatState.sidebarOpen"
      />

      <ChatBox
        v-if="chatState.activeUser"
        :user="chatState.activeUser"
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