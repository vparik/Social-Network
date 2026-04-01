window.Navbar = {
  name: "Navbar",

  components: {
    CreatePost: window.CreatePost
  },

  data() {
    return {
      isSearchOpen: false,
      isNotificationsOpen: false,
      isSettingsOpen: false,
      isCreatePostOpen: false,
      searchQuery: "",
      searchResults: [],
      searchLoading: false,
      searchError: "",
      searchDebounce: null,
      currentUserName: "",
      unreadChatCount: 0,
      notifications: [],
      unreadNotificationsCount: 0,
      notificationsLoading: false,
      selectedFollowRequest: null,
      followRequestActionLoading: false,
      selectedGroupJoinRequest: null,
      groupJoinRequestActionLoading: false,
      unsubscribeChat: null,
      unsubscribeNotifications: null
    };
  },

  watch: {
    searchQuery() {
      this.queueSearch();
    }
  },

  methods: {
    closeNavbarPanels() {
      this.isSearchOpen = false;
      this.isNotificationsOpen = false;
      this.isSettingsOpen = false;
      this.isCreatePostOpen = false;
    },

    goHome() {
      Router.push("/");
    },

    goProfile() {
      Router.push("/profile");
    },

    goGroups() {
      Router.push("/groups");
    },

    goToUserProfile(user) {
      if (!user || !user.id) return;

      this.closeSearch();
      Router.push(`/profile?id=${user.id}`);
    },

    async loadCurrentUser() {
      try {
        const res = await fetch("/api/profile", { method: "GET" });
        if (!res.ok) return;

        const data = await res.json();
        const user = data.user;
        if (!user) return;

        window.currentUser = user;
        window.Events.auth.setCurrentUser(user);

        this.currentUserName =
          `${user.firstName || ""} ${user.lastName || ""}`.trim();
      } catch (err) {
        console.warn("Failed to load current user data:", err);
      }
    },

    async loadNotifications() {
      this.notificationsLoading = true;

      try {
        const res = await fetch("/api/notifications", {
          method: "GET",
          credentials: "include"
        });

        if (!res.ok) {
          this.notifications = [];
          this.unreadNotificationsCount = 0;
          return;
        }

        const data = await res.json();
        this.notifications = Array.isArray(data.notifications)
          ? data.notifications
          : [];
        this.unreadNotificationsCount = Number(data.unreadCount || 0);
      } catch (err) {
        console.error("failed to load notifications", err);
        this.notifications = [];
        this.unreadNotificationsCount = 0;
      } finally {
        this.notificationsLoading = false;
      }
    },

    async markNotificationsRead() {
      try {
        const res = await fetch("/api/notifications/read-all", {
          method: "POST",
          headers: {
            "X-CSRF-Token": window.extractCsrfToken()
          }
        });

        if (!res.ok) return;

        this.notifications = this.notifications.map(item => ({
          ...item,
          isRead: true
        }));
        this.unreadNotificationsCount = 0;
      } catch (err) {
        console.error("failed to mark notifications read", err);
      }
    },

    notificationText(item) {
      if (!item) return "";

      const actorName = item.nickname
        ? "@" + item.nickname
        : `${item.firstName || ""} ${item.lastName || ""}`.trim() || "Someone";

      switch (item.type) {
        case "follow":
          return `${actorName} followed you`;
        case "follow_request":
          return `${actorName} requested to follow you`;
        case "follow_request_accepted":
          return `${actorName} accepted your follow request`;
        case "follow_request_rejected":
          return `${actorName} declined your follow request`;
        case "comment":
          return `${actorName} commented on your post`;
        case "group_invite":
          return `${actorName} invited you to a group`;
        case "group_join_request":
          return `${actorName} requested to join your group`;
        case "group_join_accepted":
          return `${actorName} accepted your group join request`;
        case "group_event":
          return `${actorName} created a new event in your group`;
        case "group_comment":
          return `${actorName} commented on your group post`;
        default:
          return `${actorName} sent a notification`;
      }
    },

    isFollowRequestNotification(item) {
      return !!item && item.type === "follow_request";
    },

    isGroupJoinRequestNotification(item) {
      return !!item && item.type === "group_join_request";
    },

    canOpenNotificationProfile(item) {
      if (!item || !item.actorId) return false;
    
      switch (item.type) {
        case "follow":
        case "follow_request_accepted":
          return true;
        default:
          return false;
      }
    },

    canOpenNotificationComment(item) {
      return !!item && item.type === "comment" && !!item.postId && !!item.commentId;
    },

    handleNotificationClick(item) {
      if (!item) return;

      if (this.isFollowRequestNotification(item)) {
        this.closeGroupJoinRequestPanel();
        this.openFollowRequestPanel(item);
        return;
      }

      if (this.isGroupJoinRequestNotification(item)) {
        this.closeFollowRequestPanel();
        this.openGroupJoinRequestPanel(item);
        return;
      }

      this.isNotificationsOpen = false;
      this.closeFollowRequestPanel();
      this.closeGroupJoinRequestPanel();

      if (this.canOpenNotificationComment(item)) {
        Router.push(`/?postId=${item.postId}#comment-${item.commentId}`);
        return;
      }

      if (this.canOpenNotificationProfile(item)) {
        Router.push(`/profile?id=${item.actorId}`);
        return;
      }

      if (item.entityId && ["group_join_accepted", "group_event", "group_invite", "group_comment"].includes(item.type)) {
        Router.push(`/group?id=${item.entityId}`);
      }
    },

    openFollowRequestPanel(item) {
      if (!this.isFollowRequestNotification(item)) return;
      this.selectedFollowRequest = item;
    },

    closeFollowRequestPanel() {
      this.selectedFollowRequest = null;
      this.followRequestActionLoading = false;
    },

    openGroupJoinRequestPanel(item) {
      if (!this.isGroupJoinRequestNotification(item)) return;
      this.selectedGroupJoinRequest = item;
    },

    closeGroupJoinRequestPanel() {
      this.selectedGroupJoinRequest = null;
      this.groupJoinRequestActionLoading = false;
    },

    removeFollowRequestNotificationByActorId(actorId) {
      if (!actorId) return;

      const before = this.notifications.length;

      this.notifications = this.notifications.filter(item => {
        return !(item.type === "follow_request" && item.actorId === actorId);
      });
    
      if (this.selectedFollowRequest && this.selectedFollowRequest.actorId === actorId) {
        this.closeFollowRequestPanel();
      }
    
      if (this.notifications.length < before && this.unreadNotificationsCount > 0) {
        this.unreadNotificationsCount -= 1;
      }
    },
    removeNotificationById(notificationID) {
      if (!notificationID) return;
      this.notifications = this.notifications.filter(item => item.id !== notificationID);
    },

    async acceptFollowRequest() {
      const item = this.selectedFollowRequest;
      if (!item || !item.actorId || this.followRequestActionLoading) return;

      this.followRequestActionLoading = true;

      try {
        const res = await fetch(`/api/follow/accept?id=${item.actorId}`, {
          method: "POST",
          headers: {
            "X-CSRF-Token": window.extractCsrfToken()
          }
        });

        if (!res.ok) {
          console.error("failed to accept follow request");
          return;
        }

        this.removeNotificationById(item.id);
        this.closeFollowRequestPanel();
      } catch (err) {
        console.error("failed to accept follow request", err);
      } finally {
        this.followRequestActionLoading = false;
      }
    },

    async rejectFollowRequest() {
      const item = this.selectedFollowRequest;
      if (!item || !item.actorId || this.followRequestActionLoading) return;

      this.followRequestActionLoading = true;

      try {
        const res = await fetch(`/api/follow/request?id=${item.actorId}`, {
          method: "DELETE",
          headers: {
            "X-CSRF-Token": window.extractCsrfToken()
          }
        });

        if (!res.ok) {
          console.error("failed to reject follow request");
          return;
        }

        this.removeNotificationById(item.id);
        this.closeFollowRequestPanel();
      } catch (err) {
        console.error("failed to reject follow request", err);
      } finally {
        this.followRequestActionLoading = false;
      }
    },

    async acceptGroupJoinRequest() {
      const item = this.selectedGroupJoinRequest;
      if (!item || !item.actorId || !item.entityId || this.groupJoinRequestActionLoading) return;

      this.groupJoinRequestActionLoading = true;
      try {
        const res = await fetch(`/api/groups/${item.entityId}/requests/${item.actorId}/accept`, {
          method: "POST",
          headers: { "X-CSRF-Token": window.extractCsrfToken() }
        });
        if (!res.ok) { console.error("failed to accept group join request"); return; }
        this.removeNotificationById(item.id);
        this.closeGroupJoinRequestPanel();
      } catch (err) {
        console.error("failed to accept group join request", err);
      } finally {
        this.groupJoinRequestActionLoading = false;
      }
    },

    async declineGroupJoinRequest() {
      const item = this.selectedGroupJoinRequest;
      if (!item || !item.actorId || !item.entityId || this.groupJoinRequestActionLoading) return;

      this.groupJoinRequestActionLoading = true;
      try {
        const res = await fetch(`/api/groups/${item.entityId}/requests/${item.actorId}`, {
          method: "DELETE",
          headers: { "X-CSRF-Token": window.extractCsrfToken() }
        });
        if (!res.ok) { console.error("failed to decline group join request"); return; }
        this.removeNotificationById(item.id);
        this.closeGroupJoinRequestPanel();
      } catch (err) {
        console.error("failed to decline group join request", err);
      } finally {
        this.groupJoinRequestActionLoading = false;
      }
    },

    toggleSearch() {
      const willOpen = !this.isSearchOpen;

      this.closeNavbarPanels();
      window.Events.chat.closeSidebar();

      this.isSearchOpen = willOpen;

      if (this.isSearchOpen) {
        this.$nextTick(() => {
          if (this.$refs.searchInput) {
            this.$refs.searchInput.focus();
          }
        });
      }
    },

    closeSearch() {
      this.isSearchOpen = false;
      this.searchQuery = "";
      this.searchResults = [];
      this.searchError = "";
      this.searchLoading = false;

      if (this.searchDebounce) {
        clearTimeout(this.searchDebounce);
        this.searchDebounce = null;
      }
    },

    queueSearch() {
      if (!this.isSearchOpen) return;

      if (this.searchDebounce) {
        clearTimeout(this.searchDebounce);
      }

      const query = this.searchQuery.trim();
      if (!query) {
        this.searchResults = [];
        this.searchError = "";
        this.searchLoading = false;
        return;
      }

      this.searchDebounce = setTimeout(() => {
        this.submitSearch();
      }, 250);
    },

    async submitSearch() {
      const query = this.searchQuery.trim();

      if (!query) {
        this.searchResults = [];
        this.searchError = "";
        this.searchLoading = false;
        return;
      }

      this.searchLoading = true;
      this.searchError = "";

      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
          method: "GET",
          credentials: "include"
        });

        if (!res.ok) {
          this.searchError = "Failed to search users.";
          this.searchResults = [];
          return;
        }

        const results = await res.json();

        if (this.searchQuery.trim() !== query) {
          return;
        }

        this.searchResults = Array.isArray(results) ? results : [];
      } catch (err) {
        console.error("user search failed", err);
        this.searchError = "Failed to search users.";
        this.searchResults = [];
      } finally {
        if (this.searchQuery.trim() === query) {
          this.searchLoading = false;
        }
      }
    },

    displayUserName(user) {
      if (!user) return "User";

      if (user.nickname) {
        return `@${user.nickname}`;
      }

      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      return fullName || "User";
    },

    async toggleNotifications() {
      const willOpen = !this.isNotificationsOpen;

      this.closeNavbarPanels();
      window.Events.chat.closeSidebar();

      this.isNotificationsOpen = willOpen;

      if (!this.isNotificationsOpen) {
        this.closeFollowRequestPanel();
        return;
      }

      await this.loadNotifications();

      if (this.unreadNotificationsCount > 0) {
        await this.markNotificationsRead();
      }
    },

    toggleSettings() {
      const willOpen = !this.isSettingsOpen;

      this.closeNavbarPanels();
      window.Events.chat.closeSidebar();

      this.isSettingsOpen = willOpen;
    },

    openChat() {
      this.closeNavbarPanels();
      window.Events.chat.toggleSidebar();
    },

    isChatButtonTarget(target) {
      const chatButton = this.$refs.chatButton;
      return !!chatButton && chatButton.contains(target);
    },

    openCreatePost() {
      this.closeNavbarPanels();
      window.Events.chat.closeSidebar();
      this.isCreatePostOpen = true;
    },

    async logout() {
      try {
        window.WS.disconnect();
        window.Events.chat.reset();
        window.Events.auth.clearCurrentUser();

        await fetch("/api/logout", {
          method: "POST",
          headers: {
            "X-CSRF-Token": window.extractCsrfToken()
          }
        });
      } catch (err) {
        console.error("logout failed", err);
      } finally {
        Router.push("/login");
      }
    },

    handleClickOutside(event) {
      const navbar = this.$refs.navbar;
      const searchWrapper = this.$refs.searchWrapper;

      if (!navbar) return;

      if (!navbar.contains(event.target)) {
        this.isNotificationsOpen = false;
        this.isSettingsOpen = false;
        this.closeFollowRequestPanel();
      }

      if (
        this.isSearchOpen &&
        searchWrapper &&
        !searchWrapper.contains(event.target)
      ) {
        this.closeSearch();
      }
    },

    handleEscape(event) {
      if (event.key === "Escape") {
        if (this.selectedFollowRequest) {
          this.closeFollowRequestPanel();
        }

        if (this.isCreatePostOpen) {
          this.isCreatePostOpen = false;
        }

        if (this.isSearchOpen) {
          this.closeSearch();
        }
      }
    },

    handlePostCreated() {
      this.isCreatePostOpen = false;
    }
  },

  mounted() {
    document.addEventListener("click", this.handleClickOutside);
    document.addEventListener("keyup", this.handleEscape);

    this.loadCurrentUser();
    this.loadNotifications();
    this.unreadChatCount = window.MockChat.getTotalUnreadCount();

    this.unsubscribeChat = window.MockChat.subscribe((event) => {
      if (
        event.type === "presence" ||
        event.type === "presence_snapshot" ||
        event.type === "message_received" ||
        event.type === "message_sent" ||
        event.type === "conversation_read" ||
        event.type === "users_updated"
      ) {
        this.unreadChatCount = window.MockChat.getTotalUnreadCount();
      }
    });

    this.unsubscribeNotifications = window.Events.on(
      window.Events.EVENT.NOTIFICATIONS_UPDATED,
      async (data) => {
        if (!data) {
          await this.loadNotifications();
          return;
        }

        if (data.removeFollowRequestActorId) {
          this.removeFollowRequestNotificationByActorId(data.removeFollowRequestActorId);
          return;
        }
        
        if (data.notification) {
          const exists = this.notifications.some(item => item.id === data.notification.id);
          if (!exists) {
            this.notifications.unshift(data.notification);
          }
        }

        if (typeof data.unreadCount === "number") {
          this.unreadNotificationsCount = data.unreadCount;
        } else {
          await this.loadNotifications();
          return;
        }

        if (!data.notification && this.isNotificationsOpen) {
          this.notifications = this.notifications.map(item => ({
            ...item,
            isRead: true
          }));
        }
      }
    );
  },

  beforeUnmount() {
    document.removeEventListener("click", this.handleClickOutside);
    document.removeEventListener("keyup", this.handleEscape);

    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = null;
    }

    if (this.unsubscribeChat) {
      this.unsubscribeChat();
      this.unsubscribeChat = null;
    }

    if (this.unsubscribeNotifications) {
      this.unsubscribeNotifications();
      this.unsubscribeNotifications = null;
    }
  },

  template: `
    <header class="navbar" ref="navbar">
      <div class="navbar-left">
        <button class="nav-brand" @click="goHome">
          Social Network
        </button>
      </div>

      <div class="navbar-center">
        <button class="nav-icon-btn" @click="goHome" title="Home page">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 10.5L12 3l9 7.5"></path>
            <path d="M4.5 9.75V21h6v-6h3v6h6V9.75"></path>
          </svg>
        </button>

        <button class="nav-icon-btn" @click="openCreatePost" title="Create post">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14"></path>
            <path d="M5 12h14"></path>
          </svg>
        </button>

        <div class="nav-search-wrapper" ref="searchWrapper">
          <button class="nav-icon-btn" @click.stop="toggleSearch" title="Search">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.3-4.3"></path>
            </svg>
          </button>

          <div v-if="isSearchOpen" class="nav-search-box">
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              placeholder="Search users..."
              class="nav-search-input"
            />
            <div v-if="searchLoading" class="nav-search-results">
              <div class="nav-dropdown-empty">Searching...</div>
            </div>

            <div v-else-if="searchError" class="nav-search-results">
              <div class="nav-dropdown-empty">{{ searchError }}</div>
            </div>

            <div
              v-else-if="searchQuery.trim() && searchResults.length === 0"
              class="nav-search-results"
            >
              <div class="nav-dropdown-empty">No users found</div>
            </div>

            <div v-else-if="searchResults.length > 0" class="nav-search-results">
              <button
                v-for="user in searchResults"
                :key="user.id"
                class="nav-search-result-item"
                @click="goToUserProfile(user)"
              >
                {{ displayUserName(user) }}
              </button>
            </div>
          </div>
        </div>

        <button class="nav-profile-link" @click="goGroups" title="Groups">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
            <path d="M16 3.13a4 4 0 010 7.75"></path>
          </svg>
          <span class="nav-profile-name">Groups</span>
        </button>

        <button class="nav-profile-link" @click="goProfile" title="Profile">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="7" r="4"></circle>
            <path d="M5.5 21a6.5 6.5 0 0113 0"></path>
          </svg>
          <span class="nav-profile-name">{{ currentUserName || "Profile" }}</span>
        </button>
      </div>

      <div class="navbar-right">
        <div class="nav-dropdown-wrapper">
          <button class="nav-icon-btn" @click.stop="toggleNotifications" title="Notifications">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"></path>
              <path d="M13.73 21a2 2 0 01-3.46 0"></path>
            </svg>

            <span v-if="unreadNotificationsCount > 0" class="nav-chat-badge">
              {{ unreadNotificationsCount }}
            </span>
          </button>

          <div v-if="isNotificationsOpen" class="nav-dropdown">
            <div class="nav-dropdown-title">Notifications</div>

            <div v-if="notificationsLoading" class="nav-dropdown-empty">
              Loading...
            </div>

            <div v-else-if="notifications.length === 0" class="nav-dropdown-empty">
              No notifications yet
            </div>

            <div v-else class="nav-notifications-list">
              <button
                v-for="item in notifications"
                :key="item.id"
                class="nav-dropdown-item nav-notification-item"
                @click="handleNotificationClick(item)"
              >
                {{ notificationText(item) }}
              </button>
            </div>

            <div v-if="selectedFollowRequest" class="nav-follow-request-panel">
              <div class="nav-dropdown-title">Follow Request</div>

              <div class="nav-follow-request-text">
                {{ displayUserName(selectedFollowRequest) }} wants to follow you.
              </div>

              <div class="nav-follow-request-actions">
                <button
                  class="nav-follow-request-accept"
                  :disabled="followRequestActionLoading"
                  @click="acceptFollowRequest"
                >
                  Accept
                </button>

                <button
                  class="nav-follow-request-decline"
                  :disabled="followRequestActionLoading"
                  @click="rejectFollowRequest"
                >
                  Decline
                </button>
              </div>
            </div>

            <div v-if="selectedGroupJoinRequest" class="nav-follow-request-panel">
              <div class="nav-dropdown-title">Group Join Request</div>

              <div class="nav-follow-request-text">
                {{ displayUserName(selectedGroupJoinRequest) }} wants to join your group.
              </div>

              <div class="nav-follow-request-actions">
                <button
                  class="nav-follow-request-accept"
                  :disabled="groupJoinRequestActionLoading"
                  @click="acceptGroupJoinRequest"
                >
                  Accept
                </button>

                <button
                  class="nav-follow-request-decline"
                  :disabled="groupJoinRequestActionLoading"
                  @click="declineGroupJoinRequest"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          ref="chatButton"
          class="nav-icon-btn nav-chat-btn"
          @click.stop="openChat"
          title="Chat"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a4 4 0 01-4 4H7l-4 4V7a4 4 0 014-4h10a4 4 0 014 4z"></path>
          </svg>

          <span v-if="unreadChatCount > 0" class="nav-chat-badge">
            {{ unreadChatCount }}
          </span>
        </button>

        <div class="nav-dropdown-wrapper">
          <button class="nav-power-btn" @click.stop="toggleSettings" title="Account">
            <svg
              class="nav-power-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 3v7"></path>
              <path d="M7.05 5.8A8 8 0 1 0 16.95 5.8"></path>
            </svg>
          </button>

          <div v-if="isSettingsOpen" class="nav-dropdown settings-dropdown">
            <button class="nav-dropdown-item-logout" @click="logout">
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>

    <CreatePost
      v-if="isCreatePostOpen"
      @close="isCreatePostOpen = false"
      @post-created="handlePostCreated"
    />
  `
};