window.Navbar = {
  name: "Navbar",

  emits: ["toggle-chat"],

  data() {
    return {
      isSearchOpen: false,
      isNotificationsOpen: false,
      isSettingsOpen: false,
      searchQuery: ""
    };
  },

  methods: {
    goHome() {
      Router.push("/");
    },

    goProfile() {
      // Change this later to the real user profile route
      Router.push("/profile");
    },

    toggleSearch() {
      this.isSearchOpen = !this.isSearchOpen;

      if (this.isSearchOpen) {
        this.isNotificationsOpen = false;
        this.isSettingsOpen = false;

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

      // Later:
      // here you can call your backend search endpoint
      console.log("Search users:", query);
    },

    toggleNotifications() {
      this.isNotificationsOpen = !this.isNotificationsOpen;
      this.isSettingsOpen = false;
      this.isSearchOpen = false;
    },

    toggleSettings() {
      this.isSettingsOpen = !this.isSettingsOpen;
      this.isNotificationsOpen = false;
      this.isSearchOpen = false;
    },

    openChat() {
      this.$emit("toggle-chat");
    },

    logout() {
      // Later:
      // call logout endpoint / remove session / redirect to login
      console.log("Logout clicked");
      Router.push("/login");
    },

    handleClickOutside(event) {
      const navbar = this.$refs.navbar;

      if (!navbar) return;

      if (!navbar.contains(event.target)) {
        this.isNotificationsOpen = false;
        this.isSettingsOpen = false;
      }
    }
  },

  mounted() {
    document.addEventListener("click", this.handleClickOutside);
  },

  beforeUnmount() {
    document.removeEventListener("click", this.handleClickOutside);
  },

  template: `
    <header class="navbar" ref="navbar">
      <div class="navbar-left">
        <button class="nav-brand" @click="goHome">
          Social Network
        </button>
      </div>

      <div class="navbar-center">
        <button class="nav-icon-btn" @click="goHome" title="Home">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 10.5L12 3l9 7.5"></path>
            <path d="M4.5 9.75V21h6v-6h3v6h6V9.75"></path>
          </svg>
        </button>

        <button class="nav-icon-btn" @click="goProfile" title="Profile">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="7" r="4"></circle>
            <path d="M5.5 21a6.5 6.5 0 0113 0"></path>
          </svg>
        </button>

        <div class="nav-search-wrapper">
          <button class="nav-icon-btn" @click="toggleSearch" title="Search">
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

            <!-- Later:
                 render notifications dynamically from backend -->
            <div class="nav-dropdown-empty">
              No notifications yet
            </div>
          </div>
        </div>

        <button class="nav-icon-btn" @click="openChat" title="Chat">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a4 4 0 01-4 4H7l-4 4V7a4 4 0 014-4h10a4 4 0 014 4z"></path>
          </svg>
        </button>

        <div class="nav-dropdown-wrapper">
          <button class="nav-icon-btn" @click.stop="toggleSettings" title="Settings">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="M4.93 4.93l1.41 1.41"></path>
                <path d="M17.66 17.66l1.41 1.41"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="M4.93 19.07l1.41-1.41"></path>
                <path d="M17.66 6.34l1.41-1.41"></path>
            </svg>
          </button>

          <div v-if="isSettingsOpen" class="nav-dropdown settings-dropdown">
            <button class="nav-dropdown-item" @click="logout">
              Logout
            </button>

            <!-- Later:
                 add more settings items here -->
          </div>
        </div>
      </div>
    </header>
  `
};