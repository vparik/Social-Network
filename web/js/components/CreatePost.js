window.CreatePost = {
  name: "CreatePost",

  emits: ["close", "post-created", "event-created"],

  props: {
    groupId: { type: Number, default: 0 },
    inline: { type: Boolean, default: false },
    initialMode: { type: String, default: "post" }
  },

  data() {
    return {
      mode: "post",
      showEventInviteSidebar: false,
      postVisibility: "public",
      postTitle: "",
      postDescription: "",
      submitting: false,
      imageUrl: null,
      imagePreview: null,
      imageUploading: false,
      followersLoading: false,
      followersError: "",
      followers: [],
      selectedAllowedUserIds: [],
      titleError: false,
      descriptionError: false,
      eventTitle: "",
      eventDescription: "",
      eventAt: "",
      eventTitleError: false,
      eventDescriptionError: false,
      eventAtError: false
    };
  },

  mounted() {
    this.mode = this.initialMode;
  },

  computed: {
    isEventMode() {
      return this.mode === "event";
    },

    showSidebar() {
      return !this.isEventMode && this.postVisibility === "private";
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

    switchMode(newMode) {
      if (this.submitting || this.mode === newMode) return;
      this.mode = newMode;
      this.showEventInviteSidebar = false;
    },

    handleOverlayClick() {
      if (!this.inline) this.close();
    },

    close() {
      if (this.submitting) return;

      this.mode = this.initialMode;
      this.showEventInviteSidebar = false;
      this.postTitle = "";
      this.postDescription = "";
      this.postVisibility = "public";
      this.imageUrl = null;
      this.imagePreview = null;
      this.followersError = "";
      this.selectedAllowedUserIds = [];
      this.eventTitle = "";
      this.eventDescription = "";
      this.eventAt = "";
      this.eventTitleError = false;
      this.eventDescriptionError = false;
      this.eventAtError = false;

      if (!this.inline) this.$emit("close");
    },

    extractCsrfToken() {
      return window.extractCsrfToken();
    },

    async loadFollowers() {
      this.followersLoading = true;
      this.followersError = "";

      try {
        const res = await fetch("/api/followers", { method: "GET" });

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
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

      if (nickname) return nickname;
      if (fullName) return fullName;
      return `User #${user.id}`;
    },

    async handleImageSelect(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => { this.imagePreview = e.target.result; };
      reader.readAsDataURL(file);
      this.imageUploading = true;
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/image", {
          method: "POST",
          headers: { "X-CSRF-Token": window.extractCsrfToken() },
          body: fd
        });
        if (!res.ok) {
          const msg = await res.text();
          alert("Image upload failed: " + msg);
          this.imagePreview = null;
          this.$refs.imageInput.value = "";
          return;
        }
        const data = await res.json();
        this.imageUrl = data.url;
      } catch (err) {
        alert("Image upload failed. Please try again.");
        console.error(err);
        this.imagePreview = null;
        this.$refs.imageInput.value = "";
      } finally {
        this.imageUploading = false;
      }
    },

    removeImage() {
      this.imageUrl = null;
      this.imagePreview = null;
      this.$refs.imageInput.value = "";
    },

    async handleCreatePost() {
      const title = this.postTitle.trim();
      const content = this.postDescription.trim();

      this.titleError = !title;
      this.descriptionError = !content;

      if (!title || !content) return;

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
          privacy: this.postVisibility,
          imageUrl: this.imageUrl || ""
        };

        if (this.postVisibility === "private") {
          payload.allowedUserIds = this.selectedAllowedUserIds;
        }

        const url = this.groupId
          ? `/api/groups/${this.groupId}/posts`
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

        if (!this.groupId) {
          window.Events.emit(window.Events.EVENT.POSTS_CREATED, createdPost);
        }

        this.$emit("post-created", createdPost);
        this.close();
      } catch (err) {
        console.error(err);
        alert("Network error.");
      } finally {
        this.submitting = false;
      }
    },

    async handleCreateEvent() {
      const title = this.eventTitle.trim();
      const content = this.eventDescription.trim();

      this.eventTitleError = !title;
      this.eventDescriptionError = !content;
      this.eventAtError = !this.eventAt;

      if (!title || !content || !this.eventAt) return;

      if (!this.groupId) {
        alert("No group selected for this event.");
        return;
      }

      if (this.submitting) return;
      this.submitting = true;

      try {
        const eventAt = Math.floor(new Date(this.eventAt).getTime() / 1000);
        const res = await fetch(`/api/groups/${this.groupId}/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.extractCsrfToken()
          },
          body: JSON.stringify({ title, content, eventAt })
        });

        if (!res.ok) {
          const err = await res.text();
          alert("Failed to create event: " + err);
          return;
        }

        const createdEvent = await res.json();
        this.$emit("event-created", createdEvent);
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
  <div
    :class="inline ? 'create-post-inline-wrap' : 'create-post-overlay'"
    @click.self="handleOverlayClick"
  >
    <div
      class="create-post-modal"
      :class="inline ? 'create-post-modal--inline' : {
        'create-post-modal--with-sidebar': showSidebar,
        'create-post-modal--event': isEventMode,
        'create-post-modal--event-invite': isEventMode && showEventInviteSidebar
      }"
    >
      <div class="create-post-main">
        <div v-if="!inline" class="create-post-tabs">
          <button
            type="button"
            class="create-post-tab"
            :class="{ 'is-active': !isEventMode }"
            :disabled="submitting"
            @click="switchMode('post')"
          >Post</button>
          <button
            type="button"
            class="create-post-tab"
            :class="{ 'is-active': isEventMode }"
            :disabled="submitting"
            @click="switchMode('event')"
          >Event</button>
        </div>
        <p v-else class="group-form__title">{{ isEventMode ? "Create Event" : "Create Post" }}</p>

        <template v-if="!isEventMode">
          <div v-if="!groupId" class="create-post-visibility">
            <select
              class="create-post-visibility-select"
              :value="postVisibility"
              :disabled="submitting"
              @change="selectVisibility($event.target.value)"
            >
              <option value="public">Public</option>
              <option value="selected">Followers</option>
              <option value="private">Private</option>
            </select>

            <span class="create-post-visibility-help">
              {{ visibilityHelpText }}
            </span>

            <div v-if="showSidebar" class="create-post-sidebar">
              <div class="create-post-sidebar-section">
                <div class="create-post-sidebar-title">Who can see this</div>

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
                <div class="create-post-sidebar-empty" v-if="!selectedAllowedUserIds.length">
                  No followers selected yet.
                </div>
                <div v-else class="create-post-sidebar-empty">
                  {{ selectedAllowedUserIds.length }} follower(s) selected.
                </div>
              </div>
            </div>
          </div>

          <div class="create-post-form">
            <textarea
              v-model="postTitle"
              class="create-post-input"
              :class="{ 'create-post-input--error': titleError }"
              placeholder="Title..."
              :disabled="submitting"
              @input="titleError = false"
            />
            <span v-if="titleError" class="create-post-field-error">* required</span>

            <div class="create-post-textarea-wrap">
              <textarea
                v-model="postDescription"
                class="create-post-textarea"
                :class="{ 'create-post-textarea--error': descriptionError }"
                placeholder="Description..."
                :disabled="submitting"
                @input="descriptionError = false"
              ></textarea>

              <button
                type="button"
                class="create-post-image-btn"
                :disabled="submitting || imageUploading"
                @click="$refs.imageInput.click()"
              >
                <span class="material-symbols-outlined">photo</span>
              </button>
              <input
                type="file"
                ref="imageInput"
                accept="image/*"
                style="display:none"
                @change="handleImageSelect"
              />
            </div>
            <span v-if="descriptionError" class="create-post-field-error">* required</span>

            <div v-if="imagePreview" class="post-image-preview">
              <img :src="imagePreview" alt="preview" />
              <button
                type="button"
                class="remove-image-btn"
                @click="removeImage"
                :disabled="submitting"
              >&times;</button>
            </div>
          </div>

          <div class="create-post-footer">
            <button
              v-if="!inline"
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
          <div class="create-post-form">
            <textarea
              v-model="eventTitle"
              class="create-post-input"
              :class="{ 'create-post-input--error': eventTitleError }"
              placeholder="Title..."
              :disabled="submitting"
              @input="eventTitleError = false"
            />
            <span v-if="eventTitleError" class="create-post-field-error">* required</span>

            <div class="create-post-textarea-wrap">
              <textarea
                v-model="eventDescription"
                class="create-post-textarea"
                :class="{ 'create-post-textarea--error': eventDescriptionError }"
                placeholder="Description..."
                :disabled="submitting"
                @input="eventDescriptionError = false"
              ></textarea>

              <button
                type="button"
                class="create-post-image-btn"
                :disabled="submitting || imageUploading"
                @click="$refs.imageInput.click()"
              >
                <span class="material-symbols-outlined">photo</span>
              </button>
              <input
                type="file"
                ref="imageInput"
                accept="image/*"
                style="display:none"
                @change="handleImageSelect"
              />
            </div>
            <span v-if="eventDescriptionError" class="create-post-field-error">* required</span>

            <input
              v-model="eventAt"
              type="datetime-local"
              class="create-post-input create-post-datetime"
              :class="{ 'create-post-input--error': eventAtError }"
              :disabled="submitting"
              @input="eventAtError = false"
            />
            <span v-if="eventAtError" class="create-post-field-error">* required</span>

            <div v-if="imagePreview" class="post-image-preview">
              <img :src="imagePreview" alt="preview" />
              <button
                type="button"
                class="remove-image-btn"
                @click="removeImage"
                :disabled="submitting"
              >&times;</button>
            </div>
          </div>

          <div class="create-post-footer">
            <button
              v-if="!inline"
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
              @click="handleCreateEvent"
              :disabled="submitting"
            >
              {{ submitting ? "Creating..." : "Create" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `
};
