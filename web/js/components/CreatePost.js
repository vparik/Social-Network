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
      submitting: false
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
      return (!this.isEventMode && this.postVisibility === "private") ||
        (this.isEventMode && this.showEventInviteSidebar);
    },

    visibilityHelpText() {
      switch (this.postVisibility) {
        case "public":
          return "Visible to users who can access your content based on your profile privacy.";
        case "selected":
          return "Visible to your followers only.";
        case "private":
          return "Currently visible only to you. Chosen-follower access will be added later.";
        default:
          return "";
      }
    }
  },

  methods: {
    selectVisibility(value) {
      this.postVisibility = value;
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

    toggleEventInviteSidebar() {
      if (this.submitting) return;
      this.showEventInviteSidebar = !this.showEventInviteSidebar;
    },

    close() {
      if (this.submitting) return;

      this.mode = "post";
      this.showEventInviteSidebar = false;
      this.postTitle = "";
      this.postDescription = "";
      this.postVisibility = "public";
      this.$emit("close");
    },

    extractCsrfToken() {
      return window.extractCsrfToken();
    },

    async handleCreatePost() {
      const title = this.postTitle.trim();
      const content = this.postDescription.trim();

      if (!title || !content) {
        alert("Title and content are required.");
        return;
      }

      if (this.submitting) return;
      this.submitting = true;

      try {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.extractCsrfToken()
          },
          body: JSON.stringify({
            title,
            content,
            privacy: this.postVisibility
          })
        });

        if (!res.ok) {
          const err = await res.text();
          alert("Failed to create post: " + err);
          return;
        }

        const createdPost = await res.json();

        window.Events.emit(window.Events.EVENT.POSTS_CREATED, createdPost);
        this.$emit("post-created", createdPost);
        this.close();
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
            </div>

            <div class="create-post-visibility-help">
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
              Invite
            </button>
          </div>

          <div class="create-event-form">
            <label class="create-event-label">Title</label>
            <input
              type="text"
              class="create-event-input"
              placeholder="Enter event title"
              :disabled="submitting"
            />

            <label class="create-event-label">Description</label>
            <div class="create-event-textarea-wrap">
              <textarea
                class="create-event-textarea"
                placeholder="Write something about the event"
                :disabled="submitting"
              ></textarea>

              <button
                type="button"
                class="create-event-image-btn"
                :disabled="submitting"
              >
                Img
              </button>
            </div>
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
              :disabled="submitting"
            >
              Create
            </button>
          </div>
        </div>
      </div>

      <aside
        v-if="showSidebar"
        class="create-post-sidebar"
      >
        <template v-if="!isEventMode">
          <div class="create-post-sidebar-section">
            <div class="create-post-sidebar-title">Private post</div>
            <div class="create-post-sidebar-empty">
              This post will currently be visible only to you.
            </div>
          </div>

          <div class="create-post-sidebar-section">
            <div class="create-post-sidebar-title">Coming later</div>
            <div class="create-post-sidebar-empty">
              Chosen follower selection for private posts will be added later.
            </div>
          </div>
        </template>

        <template v-else>
          <div class="create-post-sidebar-section">
            <div class="create-post-sidebar-title">Invite groups</div>
            <div class="create-post-sidebar-empty">
              The groups you can invite to the event will appear here.
            </div>
          </div>

          <div class="create-post-sidebar-section">
            <div class="create-post-sidebar-title">Invite users</div>
            <div class="create-post-sidebar-empty">
              The users you can invite to the event will appear here.
            </div>
          </div>
        </template>
      </aside>
    </div>
  </div>
  `
};