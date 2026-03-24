window.Navbar = {
  name: "Navbar",

  components: {
    CreatePost: window.CreatePost
  },

  emits: ["toggle-chat", "close-chat", "post-created"],

  data() {
    return {
      isSearchOpen: false,
      isNotificationsOpen: false,
      isSettingsOpen: false,
      isCreatePostOpen: false,
      searchQuery: "",
      currentUserName: "",
      unreadChatCount: 0,
      unsubscribeChat: null
    };
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

    async loadCurrentUser() {
      try {
        const res = await fetch("/api/profile", { method: "GET" });

        if (!res.ok) return;

        const data = await res.json();
        window.currentUser = data;
        window.dispatchEvent(new Event("user-ready"));
        this.currentUserName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
      } catch (err) {
        console.warn("Failed to load current user data:", err);
      }
    },

    toggleSearch() {
      const willOpen = !this.isSearchOpen;

      this.closeNavbarPanels();
      this.$emit("close-chat");

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
    },

    submitSearch() {
      const query = this.searchQuery.trim();
      if (!query) return;

      console.log("Search users:", query);
    },

    toggleNotifications() {
      const willOpen = !this.isNotificationsOpen;

      this.closeNavbarPanels();
      this.$emit("close-chat");

      this.isNotificationsOpen = willOpen;
    },

    toggleSettings() {
      const willOpen = !this.isSettingsOpen;

      this.closeNavbarPanels();
      this.$emit("close-chat");

      this.isSettingsOpen = willOpen;
    },

    openChat() {
      this.closeNavbarPanels();
      this.$emit("toggle-chat");
    },

    isChatButtonTarget(target) {
      const chatButton = this.$refs.chatButton;
      return !!chatButton && chatButton.contains(target);
    },

    openCreatePost() {
      this.closeNavbarPanels();
      this.$emit("close-chat");
      this.isCreatePostOpen = true;
    },

    async logout() {
      window.MockChat.disconnect();
      window.dispatchEvent(new Event("chat-reset"));
      await fetch("/api/logout", {
        method: "POST",
        headers: {
          "X-CSRF-Token": window.extractCsrfToken(),
        }
      });
      Router.push("/login");
    },

    handleClickOutside(event) {
      const navbar = this.$refs.navbar;
      const searchWrapper = this.$refs.searchWrapper;

      if (!navbar) return;

      if (!navbar.contains(event.target)) {
        this.isNotificationsOpen = false;
        this.isSettingsOpen = false;
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
        if (this.isCreatePostOpen) {
          this.isCreatePostOpen = false;
        }

        if (this.isSearchOpen) {
          this.closeSearch();
        }
      }
    }
  },

  mounted() {
    document.addEventListener("click", this.handleClickOutside);
    document.addEventListener("keyup", this.handleEscape);
    this.loadCurrentUser();

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
  },

  beforeUnmount() {
    document.removeEventListener("click", this.handleClickOutside);
    document.removeEventListener("keyup", this.handleEscape);
    if (this.unsubscribeChat) {
      this.unsubscribeChat();
      this.unsubscribeChat = null;
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
              @keyup.enter="submitSearch"
            />
            <button class="nav-search-go" @click="submitSearch">Go</button>
          </div>
        </div>

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
          </button>

          <div v-if="isNotificationsOpen" class="nav-dropdown">
            <div class="nav-dropdown-title">Notifications</div>
            <div class="nav-dropdown-empty">
              No notifications yet
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

          <span
            v-if="unreadChatCount > 0"
            class="nav-chat-badge"
          >
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
            <button class="nav-dropdown-item" @click="logout">
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>

    <CreatePost
      v-if="isCreatePostOpen"
      @close="isCreatePostOpen = false"
      @post-created="$emit('post-created')"
    />
  `
};