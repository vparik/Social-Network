window.Navbar = {
  name: "Navbar",

  emits: ["toggle-chat", "post-created"],

  data() {
    return {
      isSearchOpen: false,
      isNotificationsOpen: false,
      isSettingsOpen: false,
      isCreatePostOpen: false,
      searchQuery: "",
      postVisibility: "public",
      postTitle: "",
      postDescription: "",
      currentUserName: ""
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

    async loadCurrentUser() {
      try {
        const res = await fetch("/api/profile", { method: "GET" });

        if (!res.ok) return;

        const data = await res.json();
        // store globally
        window.currentUser = data;
        // notify the app
        window.dispatchEvent(new Event("user-ready"));
        this.currentUserName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
      } catch (err) {
        console.warn("Failed to load current user data:", err);
      }
    },

    toggleSearch() {
      this.isSearchOpen = !this.isSearchOpen;

      if (this.isSearchOpen) {
        this.isNotificationsOpen = false;
        this.isSettingsOpen = false;
        this.isCreatePostOpen = false;

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

      // here you can call your backend search endpoint
      console.log("Search users:", query);
    },

    toggleNotifications() {
      this.isNotificationsOpen = !this.isNotificationsOpen;
      this.isSettingsOpen = false;
      this.isSearchOpen = false;
      this.isCreatePostOpen = false;
    },

    toggleSettings() {
      this.isSettingsOpen = !this.isSettingsOpen;
      this.isNotificationsOpen = false;
      this.isSearchOpen = false;
      this.isCreatePostOpen = false;
    },

    openChat() {
      this.$emit("toggle-chat");
    },

    openCreatePost() {
      this.isCreatePostOpen = true;
      this.isNotificationsOpen = false;
      this.isSettingsOpen = false;
      this.isSearchOpen = false;
    },

    closeCreatePost() {
      this.isCreatePostOpen = false;
      this.postTitle = "";
      this.postDescription = "";
      this.postVisibility = "public";
    },

    selectVisibility(value) {
      this.postVisibility = value;
    },

    extractCsrfToken() {
      return window.extractCsrfToken();
    },

    async handleCreatePost() {
      const title = this.postTitle.trim();
      const content = this.postDescription.trim();

      // Basic client-side validation before hitting the API
      if (!title || !content) {
        //TODO: fix
        alert("Title and content are required.");
        return;
      }

      try {
        // POST /api/posts — field names must match backend JSON struct
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.extractCsrfToken(),
          },
          body: JSON.stringify({ title, content, privacy: this.postVisibility })
        });

        if (!res.ok) {
          const err = await res.text();
          alert("Failed to create post: " + err);
          return;
        }

        // Tell the parent (HomePage) to refresh the feed
        this.$emit("post-created");
        this.closeCreatePost();
      } catch (err) {
        console.error("Create post error:", err);
        alert("Network error. Please try again.");
      }
    },
    
    async logout() {
      await fetch("/api/logout", { 
        method: "POST",
        headers: {
          "X-CSRF-Token": this.extractCsrfToken(),
        }
      })
      
      Router.push("/login")
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
        this.closeCreatePost();
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
  },

  beforeUnmount() {
    document.removeEventListener("click", this.handleClickOutside);
    document.removeEventListener("keyup", this.handleEscape);
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

          <button class="nav-icon-btn" @click="openChat" title="Chat">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a4 4 0 01-4 4H7l-4 4V7a4 4 0 014-4h10a4 4 0 014 4z"></path>
            </svg>
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

      <div
        v-if="isCreatePostOpen"
        class="create-post-overlay"
        @click.self="closeCreatePost"
      >
        <div
          class="create-post-modal"
          :class="{ 'create-post-modal--with-sidebar': postVisibility === 'private' }"
        >
          <div class="create-post-main">
            <div class="create-post-header">
              <h2 class="create-post-title">Create post</h2>
            </div>

            <div class="create-post-visibility">
              <span class="create-post-visibility-label">
                Select visibility:
              </span>

              <div class="create-post-visibility-actions">
                <button
                  type="button"
                  class="create-post-visibility-btn"
                  :class="{ 'is-active': postVisibility === 'public' }"
                  @click="selectVisibility('public')"
                >
                  Public
                </button>

                <button
                  type="button"
                  class="create-post-visibility-btn"
                  :class="{ 'is-active': postVisibility === 'selected' }"
                  @click="selectVisibility('selected')"
                >
                  Almost private
                </button>

                <button
                  type="button"
                  class="create-post-visibility-btn"
                  :class="{ 'is-active': postVisibility === 'private' }"
                  @click="selectVisibility('private')"
                >
                  Private
                </button>
              </div>
            </div>

            <div class="create-post-form">
              <label class="create-post-label" for="post-title">Title</label>
              <input
                id="post-title"
                v-model="postTitle"
                type="text"
                class="create-post-input"
                required
              />

              <label class="create-post-label" for="post-description">Description</label>
              <div class="create-post-textarea-wrap">
                <textarea
                  id="post-description"
                  v-model="postDescription"
                  class="create-post-textarea"
                  required
                ></textarea>

                <button
                  type="button"
                  class="create-post-image-btn"
                >
                  Img
                </button>
              </div>
            </div>

            <div class="create-post-footer">
              <button
                type="button"
                class="create-post-action-btn create-post-cancel-btn"
                @click="closeCreatePost"
              >
                Cancel
              </button>

              <button
                type="button"
                class="create-post-action-btn create-post-submit-btn"
                @click="handleCreatePost"
              >
                Create
              </button>
            </div>
          </div>

          <aside
            v-if="postVisibility === 'private'"
            class="create-post-sidebar"
          >
            <div class="create-post-sidebar-section">
              <div class="create-post-sidebar-title">Groups</div>
              <div class="create-post-sidebar-empty">
                Groups will appear here when that feature is ready.
              </div>
            </div>

            <div class="create-post-sidebar-section">
              <div class="create-post-sidebar-title">Users</div>
              <div class="create-post-sidebar-empty">
                User selection will appear here later.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  `
};