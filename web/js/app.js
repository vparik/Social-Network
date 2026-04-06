const routes = {
  "/register": RegisterPage,
  "/login": LoginPage,
  "/": HomePage,
  "/profile": ProfilePage,
  "/groups": GroupsPage,
  "/group": GroupPage
};

const publicRoutes = ["/login", "/register"];

const App = {
  data() {
    return {
      confirmState: {
        isOpen: false,
        title: "",
        message: "",
        confirmText: "Confirm",
        cancelText: "Cancel",
        danger: false,
        resolve: null
      }
    };
  },
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
    window.AppConfirm = {
      open: this.openConfirm
    };

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
    openConfirm(options = {}) {
      return new Promise((resolve) => {
        this.confirmState.isOpen = true;
        this.confirmState.title = options.title || "Confirm action";
        this.confirmState.message = options.message || "Are you sure?";
        this.confirmState.confirmText = options.confirmText || "Confirm";
        this.confirmState.cancelText = options.cancelText || "Cancel";
        this.confirmState.danger = !!options.danger;
        this.confirmState.resolve = resolve;
      });
    },

    confirmModalConfirm() {
      if (this.confirmState.resolve) {
        this.confirmState.resolve(true);
      }

      this.resetConfirmState();
    },

    confirmModalCancel() {
      if (this.confirmState.resolve) {
        this.confirmState.resolve(false);
      }

      this.resetConfirmState();
    },

    resetConfirmState() {
      this.confirmState.isOpen = false;
      this.confirmState.title = "";
      this.confirmState.message = "";
      this.confirmState.confirmText = "Confirm";
      this.confirmState.cancelText = "Cancel";
      this.confirmState.danger = false;
      this.confirmState.resolve = null;
    },

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
          case "comment_deleted":
            if (!event.data || !event.data.postId || !event.data.commentId) return;
            window.Events.emit(window.Events.EVENT.COMMENTS_DELETED, {
              postId: event.data.postId,
              commentId: event.data.commentId
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

          case "group_post_created":
            if (!event.data) return;
            window.Events.emit(window.Events.EVENT.GROUP_POST_CREATED, event.data);
            break;
          case "group_post_deleted":
            if (!event.data) return;
            window.Events.emit(window.Events.EVENT.GROUP_POST_DELETED, event.data);
            break;
          case "group_comment_created":
            if (!event.data) return;
            window.Events.emit(window.Events.EVENT.GROUP_COMMENT_CREATED, event.data);
            break;
          case "group_comment_deleted":
            if (!event.data) return;
            window.Events.emit(window.Events.EVENT.GROUP_COMMENT_DELETED, event.data);
            break;
          case "group_event_created":
            if (!event.data) return;
            window.Events.emit(window.Events.EVENT.GROUP_EVENT_CREATED, event.data);
            break;
          case "group_event_vote_updated":
            if (!event.data) return;
            window.Events.emit(window.Events.EVENT.GROUP_EVENT_VOTE_UPDATED, event.data);
            break;
          case "group_message":
            if (!event.data) return;
            window.Events.emit(window.Events.EVENT.GROUP_MESSAGE, event.data);
            break;
          case "group_member_changed":
            if (!event.data) return;
            window.Events.emit(window.Events.EVENT.GROUP_MEMBER_CHANGED, event.data);
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

    handleDocumentClick() {
    }
  },

  beforeUnmount() {
    document.removeEventListener("click", this.handleDocumentClick, true);

    if (this._unsubscribeRealtimeFeed) {
      this._unsubscribeRealtimeFeed();
      this._unsubscribeRealtimeFeed = null;
    }

    window.AppConfirm = null;
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
      :route-query="routeState.query"
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

    <ConfirmModal
      :isOpen="confirmState.isOpen"
      :title="confirmState.title"
      :message="confirmState.message"
      :confirmText="confirmState.confirmText"
      :cancelText="confirmState.cancelText"
      :danger="confirmState.danger"
      @confirm="confirmModalConfirm"
      @cancel="confirmModalCancel"
    />
  `
};

const app = Vue.createApp(App);

app.component("Navbar", Navbar);
app.component("ChatSidebar", ChatSidebar);
app.component("ChatBox", ChatBox);
app.component("CommentSection", CommentSection);
app.component("ConfirmModal", window.ConfirmModal);
app.component("GroupPostCard", window.GroupPostCard);
app.component("CreatePost", window.CreatePost);

app.mount("#app");