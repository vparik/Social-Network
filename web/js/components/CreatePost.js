window.CreatePost = {
  name: "CreatePost",

  emits: ["close", "post-created"],

  data() {
    return {
      postVisibility: "public",
      postTitle: "",
      postDescription: ""
    }
  },

  methods: {

    selectVisibility(value) {
      this.postVisibility = value
    },

    close() {
      this.postTitle = ""
      this.postDescription = ""
      this.postVisibility = "public"
      this.$emit("close")
    },

    extractCsrfToken() {
      return window.extractCsrfToken()
    },

    async handleCreatePost() {

      const title = this.postTitle.trim()
      const content = this.postDescription.trim()

      if (!title || !content) {
        alert("Title and content are required.")
        return
      }

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
        })

        if (!res.ok) {
          const err = await res.text()
          alert("Failed to create post: " + err)
          return
        }

        this.$emit("post-created")
        this.close()

      } catch (err) {
        console.error(err)
        alert("Network error.")
      }
    }

  },

  template: `
  <div class="create-post-overlay" @click.self="close">
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
              class="create-post-visibility-btn"
              :class="{ 'is-active': postVisibility === 'public' }"
              @click="selectVisibility('public')"
            >
              Public
            </button>

            <button
              class="create-post-visibility-btn"
              :class="{ 'is-active': postVisibility === 'selected' }"
              @click="selectVisibility('selected')"
            >
              Almost private
            </button>

            <button
              class="create-post-visibility-btn"
              :class="{ 'is-active': postVisibility === 'private' }"
              @click="selectVisibility('private')"
            >
              Private
            </button>
          </div>
        </div>

        <div class="create-post-form">
          <label class="create-post-label">Title</label>
          <input
            v-model="postTitle"
            type="text"
            class="create-post-input"
          />

          <label class="create-post-label">Description</label>
          <div class="create-post-textarea-wrap">
            <textarea
              v-model="postDescription"
              class="create-post-textarea"
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
            class="create-post-action-btn create-post-cancel-btn"
            @click="close"
          >
            Cancel
          </button>

          <button
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
  `
}