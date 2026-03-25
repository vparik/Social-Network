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
    this.bindRealtimeFeed();
    await this.bootstrapAuth();
    await this.ensureRealtimeConnected();
    await this.ensureChatInit();
    document.addEventListener("click", this.handleDocumentClick, true);
  },

  watch: {
    async "routeState.path"() {
      await this.bootstrapAuth();
      await this.ensureRealtimeConnected();
      await this.ensureChatInit();
    },

    async "authState.status"() {
      await this.ensureRealtimeConnected();
      await this.ensureChatInit();
    },

    async "authState.currentUser"() {
      await this.ensureRealtimeConnected();
      await this.ensureChatInit();
    }
  },

  methods: {
    bindRealtimeFeed() {
      if (this._unsubscribeRealtimeFeed) return;
    
      this._unsubscribeRealtimeFeed = window.WS.subscribe((event) => {
        switch (event.type) {
          case "notification_created":
          case "notifications_read":
            window.Events.emit(window.Events.EVENT.NOTIFICATIONS_UPDATED, event.data || {});
            break;
          
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
          
          case "comment_created":
            if (!event.data || !event.data.postId || !event.data.comment) return;
            window.Events.emit(window.Events.EVENT.COMMENTS_CREATED, {
              postId: event.data.postId,
              comment: event.data.comment
            });
            break;
          
          case "relationship_changed":
            if (!event.data) return;
            window.Events.emit(window.Events.EVENT.PROFILE_FOLLOW_CHANGED, event.data);           
            break;
          
          case "profile_privacy_changed":
          if (!event.data) return;
          window.Events.emit(window.Events.EVENT.PROFILE_PRIVACY_CHANGED, event.data);
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
        window.WS.disconnect();
        window.Events.auth.markGuest();
        window.Router.replace("/login");
        return;
      }

      const data = await res.json();
      const user = data.user;

      if (!user) {
        window.WS.disconnect();
        window.Events.auth.markGuest();
        window.Router.replace("/login");
        return;
      }

      window.currentUser = user;
      window.Events.auth.setCurrentUser(user);
    } catch (err) {
      window.WS.disconnect();
      window.Events.auth.markGuest();
      window.Router.replace("/login");
    }
  },

    async ensureRealtimeConnected() {
      if (this.isPublicRoute) {
        window.WS.disconnect();
        return;
      }
    
      if (this.authState.status !== "authenticated") return;
      if (!this.authState.currentUser || !this.authState.currentUser.id) return;
      if (window.WS.isConnected()) return;
    
      await window.WS.connect();
    },

    async ensureChatInit() {
      if (this.isPublicRoute) return;
      if (this.authState.status !== "authenticated") return;
      if (!this.authState.currentUser || !this.authState.currentUser.id) return;
      if (!window.WS.isConnected()) return;
      if (this.chatState.initialized) return;

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

    if (this._unsubscribeRealtimeFeed) {
      this._unsubscribeRealtimeFeed();
      this._unsubscribeRealtimeFeed = null;
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