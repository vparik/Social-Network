window.CreatePost = {
  name: "CreatePost",

  emits: ["close", "post-created"],

  data() {
    return {
      mode: "post",
      isFlipping: false,
      showEventInviteSidebar: false,
      postVisibility: "public",
      postTitle: "",
      postDescription: "",
      submitting: false,

      followersLoading: false,
      followersError: "",
      followers: [],
      selectedAllowedUserIds: [],

      // Group destination
      showGroupSidebar: false,
      groups: [],
      groupsLoading: false,
      selectedGroupId: null,
      selectedGroupName: "",

      // Event fields
      eventTitle: "",
      eventContent: "",
      eventAt: ""
    };
  },

  computed: {
    isEventMode() {
      return this.mode === "event";
    },

    modalTitle() {
      return this.isEventMode ? "Create event" : "Create post";
    },

    cornerButtonLabel() {
      return this.isEventMode ? "POST" : "EVENT";
    },

    showSidebar() {
      return (!this.isEventMode && (this.postVisibility === "private" || this.showGroupSidebar)) ||
        (this.isEventMode && this.showEventInviteSidebar);
    },

    postSidebarMode() {
      if (this.isEventMode) return null;
      if (this.showGroupSidebar) return "groups";
      if (this.postVisibility === "private") return "private";
      return null;
    },

    visibilityHelpText() {
      switch (this.postVisibility) {
        case "public":
          return "Visible to users who can access your content based on your profile privacy.";
        case "selected":
          return "Visible to your followers only.";
        case "private":
          return "Visible only to you and the followers you choose.";
        default:
          return "";
      }
    }
  },

  methods: {
    async selectVisibility(value) {
      this.postVisibility = value;

      if (value !== "private") {
        this.selectedAllowedUserIds = [];
        return;
      }

      if (!this.followers.length && !this.followersLoading) {
        await this.loadFollowers();
      }
    },

    toggleMode() {
      if (this.isFlipping || this.submitting) return;

      this.isFlipping = true;

      setTimeout(() => {
        this.mode = this.isEventMode ? "post" : "event";
        this.showEventInviteSidebar = false;
      }, 180);

      setTimeout(() => {
        this.isFlipping = false;
      }, 520);
    },

    async toggleEventInviteSidebar() {
      if (this.submitting) return;
      this.showEventInviteSidebar = !this.showEventInviteSidebar;
      if (this.showEventInviteSidebar && !this.groups.length && !this.groupsLoading) {
        await this.loadGroups();
      }
    },

    close() {
      if (this.submitting) return;

      this.mode = "post";
      this.showEventInviteSidebar = false;
      this.showGroupSidebar = false;
      this.postTitle = "";
      this.postDescription = "";
      this.postVisibility = "public";
      this.followersError = "";
      this.selectedAllowedUserIds = [];
      this.selectedGroupId = null;
      this.selectedGroupName = "";
      this.eventTitle = "";
      this.eventContent = "";
      this.eventAt = "";
      this.$emit("close");
    },

    extractCsrfToken() {
      return window.extractCsrfToken();
    },

    async loadFollowers() {
      this.followersLoading = true;
      this.followersError = "";

      try {
        const res = await fetch("/api/followers", {
          method: "GET"
        });

        if (!res.ok) {
          const err = await res.text();
          this.followersError = err || "Failed to load followers.";
          this.followers = [];
          return;
        }

        const data = await res.json();
        this.followers = Array.isArray(data) ? data : [];
      } catch (err) {
        console.error(err);
        this.followersError = "Network error while loading followers.";
        this.followers = [];
      } finally {
        this.followersLoading = false;
      }
    },

    toggleAllowedUser(userId) {
      if (this.submitting) return;

      if (this.selectedAllowedUserIds.includes(userId)) {
        this.selectedAllowedUserIds = this.selectedAllowedUserIds.filter(id => id !== userId);
        return;
      }

      this.selectedAllowedUserIds = [...this.selectedAllowedUserIds, userId];
    },

    isUserSelected(userId) {
      return this.selectedAllowedUserIds.includes(userId);
    },

    displayFollowerName(user) {
      const nickname = (user.nickname || "").trim();
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();

      if (nickname) return nickname;
      if (fullName) return fullName;
      return `User #${user.id}`;
    },

    async toggleGroupSidebar() {
      if (this.submitting) return;
      this.showGroupSidebar = !this.showGroupSidebar;
      if (this.showGroupSidebar && !this.groups.length && !this.groupsLoading) {
        await this.loadGroups();
      }
    },

    async loadGroups() {
      this.groupsLoading = true;
      try {
        const res = await fetch("/api/groups");
        if (res.ok) {
          const all = await res.json();
          this.groups = all.filter(g => g.isMember);
        }
      } catch (e) {
        console.error("loadGroups error", e);
      } finally {
        this.groupsLoading = false;
      }
    },

    selectGroup(group) {
      this.selectedGroupId = group.id;
      this.selectedGroupName = group.title;
      this.showGroupSidebar = false;
      // Group posts have no privacy concept
      if (!this.isEventMode) this.postVisibility = "public";
    },

    clearGroup() {
      this.selectedGroupId = null;
      this.selectedGroupName = "";
    },

    async handleCreateEvent() {
      const title = this.eventTitle.trim();
      const content = this.eventContent.trim();
      const eventAt = this.eventAt;

      if (!title || !eventAt) {
        alert("Title and date/time are required.");
        return;
      }

      if (!this.selectedGroupId) {
        alert("Please select a group for this event.");
        return;
      }

      if (this.submitting) return;
      this.submitting = true;

      try {
        const eventAtUnix = Math.floor(new Date(eventAt).getTime() / 1000);
        const res = await fetch(`/api/groups/${this.selectedGroupId}/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.extractCsrfToken()
          },
          body: JSON.stringify({ title, content, eventAt: eventAtUnix })
        });

        if (!res.ok) {
          const err = await res.text();
          alert("Failed to create event: " + err);
          return;
        }

        this.submitting = false;
        this.close();
        return;
      } catch (err) {
        console.error(err);
        alert("Network error.");
      } finally {
        this.submitting = false;
      }
    },

    async handleCreatePost() {
      const title = this.postTitle.trim();
      const content = this.postDescription.trim();

      if (!title || !content) {
        alert("Title and content are required.");
        return;
      }

      if (this.postVisibility === "private" && this.selectedAllowedUserIds.length === 0) {
        alert("Select at least one follower for a private post.");
        return;
      }

      if (this.submitting) return;
      this.submitting = true;

      try {
        const payload = {
          title,
          content,
          privacy: this.postVisibility
        };

        if (this.postVisibility === "private") {
          payload.allowedUserIds = this.selectedAllowedUserIds;
        }

        const url = this.selectedGroupId
          ? `/api/groups/${this.selectedGroupId}/posts`
          : "/api/posts";

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.extractCsrfToken()
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.text();
          alert("Failed to create post: " + err);
          return;
        }

        const createdPost = await res.json();

        if (!this.selectedGroupId) {
          window.Events.emit(window.Events.EVENT.POSTS_CREATED, createdPost);
          this.$emit("post-created", createdPost);
        }
        this.submitting = false;
        this.close();
        return;
      } catch (err) {
        console.error(err);
        alert("Network error.");
      } finally {
        this.submitting = false;
      }
    }
  },

  template: `
  <div class="create-post-overlay" @click.self="close">
    <div
      class="create-post-modal"
      :class="{
        'create-post-modal--with-sidebar': showSidebar,
        'create-post-modal--event': isEventMode,
        'create-post-modal--flipping': isFlipping
      }"
    >
      <button
        type="button"
        class="create-post-corner-toggle"
        :class="{ 'is-flipping': isFlipping }"
        @click="toggleMode"
      >
        <span class="create-post-corner-toggle__page"></span>
        <span class="create-post-corner-toggle__shadow"></span>
        <span class="create-post-corner-toggle__label">{{ cornerButtonLabel }}</span>
      </button>

      <div class="create-post-main">
        <div class="create-post-header">
          <h2 class="create-post-title">{{ modalTitle }}</h2>
        </div>

        <template v-if="!isEventMode">
          <div class="create-post-visibility">
            <span class="create-post-visibility-label">
              Select visibility:
            </span>

            <div class="create-post-visibility-actions">
              <template v-if="!selectedGroupId">
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
                  Followers
                </button>

                <button
                  type="button"
                  class="create-post-visibility-btn"
                  :class="{ 'is-active': postVisibility === 'private' }"
                  @click="selectVisibility('private')"
                >
                  Private
                </button>
              </template>

              <template v-else>
                <span style="font-size:0.85rem;color:var(--text-secondary,#b0b3b8)">
                  Posting to:
                </span>
                <span style="font-size:0.85rem;font-weight:600;color:var(--accent,#2374e1)">
                  {{ selectedGroupName }}
                </span>
                <button
                  type="button"
                  class="create-post-visibility-btn"
                  style="padding:2px 8px;font-size:0.78rem"
                  @click="clearGroup"
                  :disabled="submitting"
                >✕ Clear</button>
              </template>

              <!-- Groups icon button -->
              <button
                type="button"
                class="create-post-visibility-btn"
                :class="{ 'is-active': showGroupSidebar }"
                style="margin-left:auto"
                @click="toggleGroupSidebar"
                :disabled="submitting"
                title="Post to a group"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 010 7.75"></path>
                </svg>
                Groups
              </button>
            </div>

            <div class="create-post-visibility-help" v-if="!selectedGroupId">
              {{ visibilityHelpText }}
            </div>
          </div>

          <div class="create-post-form">
            <label class="create-post-label">Title</label>
            <input
              v-model="postTitle"
              type="text"
              class="create-post-input"
              :disabled="submitting"
            />

            <label class="create-post-label">Description</label>
            <div class="create-post-textarea-wrap">
              <textarea
                v-model="postDescription"
                class="create-post-textarea"
                :disabled="submitting"
              ></textarea>

              <button
                type="button"
                class="create-post-image-btn"
                :disabled="submitting"
              >
                Img
              </button>
            </div>
          </div>

          <div class="create-post-footer">
            <button
              type="button"
              class="create-post-action-btn create-post-cancel-btn"
              @click="close"
              :disabled="submitting"
            >
              Cancel
            </button>

            <button
              type="button"
              class="create-post-action-btn create-post-submit-btn"
              @click="handleCreatePost"
              :disabled="submitting"
            >
              {{ submitting ? "Creating..." : "Create" }}
            </button>
          </div>
        </template>

        <div v-else class="create-event-layout">
          <div class="create-event-top">
            <button
              type="button"
              class="create-event-invite-btn"
              :class="{ 'is-active': showEventInviteSidebar }"
              @click="toggleEventInviteSidebar"
              :disabled="submitting"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                <path d="M16 3.13a4 4 0 010 7.75"></path>
              </svg>
              {{ selectedGroupId ? selectedGroupName : "Select Group" }}
            </button>
          </div>

          <div class="create-event-form">
            <label class="create-event-label">Title</label>
            <input
              v-model="eventTitle"
              type="text"
              class="create-event-input"
              placeholder="Enter event title"
              :disabled="submitting"
            />

            <label class="create-event-label">Description</label>
            <div class="create-event-textarea-wrap">
              <textarea
                v-model="eventContent"
                class="create-event-textarea"
                placeholder="Write something about the event"
                :disabled="submitting"
              ></textarea>
            </div>

            <label class="create-event-label">Date &amp; Time</label>
            <input
              v-model="eventAt"
              type="datetime-local"
              class="create-event-input"
              :disabled="submitting"
            />
          </div>

          <div class="create-event-footer">
            <button
              type="button"
              class="create-event-action-btn create-event-cancel-btn"
              @click="close"
              :disabled="submitting"
            >
              Cancel
            </button>

            <button
              type="button"
              class="create-event-action-btn create-event-submit-btn"
              :disabled="submitting || !eventTitle.trim() || !eventAt || !selectedGroupId"
              @click="handleCreateEvent"
            >
              {{ submitting ? "Creating..." : "Create" }}
            </button>
          </div>
        </div>
      </div>

      <aside
        v-if="showSidebar"
        class="create-post-sidebar"
      >
        <!-- Post sidebar: private users OR group picker -->
        <template v-if="!isEventMode">
          <template v-if="postSidebarMode === 'groups'">
            <div class="create-post-sidebar-section">
              <div class="create-post-sidebar-title">Post to a group</div>

              <div v-if="groupsLoading" class="create-post-sidebar-empty">
                Loading groups...
              </div>
              <div v-else-if="!groups.length" class="create-post-sidebar-empty">
                You are not a member of any group yet.
              </div>
              <div v-else class="create-post-user-list">
                <button
                  v-for="group in groups"
                  :key="group.id"
                  type="button"
                  class="create-post-user-option"
                  :class="{ 'is-selected': selectedGroupId === group.id }"
                  @click="selectGroup(group)"
                >
                  <span class="create-post-user-option__name">{{ group.title }}</span>
                  <span style="font-size:0.75rem;color:var(--text-secondary,#b0b3b8)">
                    {{ group.memberCount }} members
                  </span>
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="create-post-sidebar-section">
              <div class="create-post-sidebar-title">Private post access</div>

              <div v-if="followersLoading" class="create-post-sidebar-empty">
                Loading followers...
              </div>

              <div v-else-if="followersError" class="create-post-sidebar-empty">
                {{ followersError }}
              </div>

              <div v-else-if="!followers.length" class="create-post-sidebar-empty">
                You do not have any followers to select yet.
              </div>

              <div v-else class="create-post-user-list">
                <button
                  v-for="user in followers"
                  :key="user.id"
                  type="button"
                  class="create-post-user-option"
                  :class="{ 'is-selected': isUserSelected(user.id) }"
                  @click="toggleAllowedUser(user.id)"
                >
                  <span class="create-post-user-option__name">
                    {{ displayFollowerName(user) }}
                  </span>
                </button>
              </div>
            </div>

            <div class="create-post-sidebar-section">
              <div class="create-post-sidebar-title">Selected</div>
              <div class="create-post-sidebar-empty" v-if="!selectedAllowedUserIds.length">
                No followers selected yet.
              </div>
              <div v-else class="create-post-sidebar-empty">
                {{ selectedAllowedUserIds.length }} follower(s) selected.
              </div>
            </div>
          </template>
        </template>

        <!-- Event sidebar: group picker -->
        <template v-else>
          <div class="create-post-sidebar-section">
            <div class="create-post-sidebar-title">Select destination group</div>

            <div v-if="groupsLoading" class="create-post-sidebar-empty">
              Loading groups...
            </div>
            <div v-else-if="!groups.length" class="create-post-sidebar-empty">
              You are not a member of any group yet.
            </div>
            <div v-else class="create-post-user-list">
              <button
                v-for="group in groups"
                :key="group.id"
                type="button"
                class="create-post-user-option"
                :class="{ 'is-selected': selectedGroupId === group.id }"
                @click="selectGroup(group); showEventInviteSidebar = false"
              >
                <span class="create-post-user-option__name">{{ group.title }}</span>
                <span style="font-size:0.75rem;color:var(--text-secondary,#b0b3b8)">
                  {{ group.memberCount }} members
                </span>
              </button>
            </div>
          </div>
        </template>
      </aside>
    </div>
  </div>
  `
};