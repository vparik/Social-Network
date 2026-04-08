window.HomePage = {
  name: "HomePage",

  props: {
    routeQuery: {
      type: String,
      default: ""
    }
  },

  data() {
    return {
      loading: true,
      error: null,
      posts: [],
      unsubscribePostCreated: null,
      unsubscribePostDeleted: null,
      unsubscribePrivacyChanged: null,
      unsubscribeFollowChanged: null
    };
  },

  computed: {
    focusedPostId() {
      const params = new URLSearchParams(this.routeQuery || "");
      const value = parseInt(params.get("postId"), 10);
      return Number.isInteger(value) && value > 0 ? value : null;
    },

    focusedCommentId() {
      const params = new URLSearchParams(this.routeQuery || "");
      const value = parseInt(params.get("commentId"), 10);
      return Number.isInteger(value) && value > 0 ? value : null;
    }
  },

  async mounted() {
    this.unsubscribePostCreated = window.Events.on(
      window.Events.EVENT.POSTS_CREATED,
      (post) => {
        if (!post || !post.id) return;

        if (this.focusedPostId && post.id !== this.focusedPostId) return;

        const exists = this.posts.some(existing => existing.id === post.id);
        if (exists) return;

        this.posts.unshift(post);

        if (this.focusedPostId === post.id) {
          this.requestCommentFocus();
        }
      }
    );

    this.unsubscribePostDeleted = window.Events.on(
      window.Events.EVENT.POSTS_DELETED,
      ({ postId }) => {
        if (!postId) return;
        this.posts = this.posts.filter(post => post.id !== postId);
      }
    );

    this.unsubscribePrivacyChanged = window.Events.on(
      window.Events.EVENT.PROFILE_PRIVACY_CHANGED,
      async () => {
        await this.loadPosts();
      }
    
    );
    this.unsubscribeFollowChanged = window.Events.on(
      window.Events.EVENT.PROFILE_FOLLOW_CHANGED,
      async () => {
        await this.loadPosts();
      }
    );
    try {
      const res = await fetch("/api/home", { method: "GET" });

      if (!res.ok) {
        Router.replace("/login");
        this.loading = false;
        return;
      }

      this.loading = false;
      await this.loadPosts();
    } catch {
      this.error = "Failed to load session";
      console.warn("API unavailable (dev mode)");
      this.loading = false;
    }
  },

  watch: {
    routeQuery: {
      immediate: false,
      async handler() {
        if (this.loading) return;
        await this.loadPosts();
      }
    }
  },

  beforeUnmount() {
    if (this.unsubscribePostCreated) {
      this.unsubscribePostCreated();
      this.unsubscribePostCreated = null;
    }

    if (this.unsubscribePostDeleted) {
      this.unsubscribePostDeleted();
      this.unsubscribePostDeleted = null;
    }

    if (this.unsubscribePrivacyChanged) {
      this.unsubscribePrivacyChanged();
      this.unsubscribePrivacyChanged = null;
    }

    if (this.unsubscribeFollowChanged) {
      this.unsubscribeFollowChanged();
      this.unsubscribeFollowChanged = null;
    }
  },

  methods: {
    async loadPosts() {
      try {
        const res = await fetch("/api/posts", { method: "GET" });
        if (!res.ok) return;

        let posts = await res.json();

        if (this.focusedPostId) {
          posts = posts.filter(post => post.id === this.focusedPostId);
        }

        this.posts = posts;
        this.requestCommentFocus();
      } catch (err) {
        console.error("Failed to load posts:", err);
      }
    },

    requestCommentFocus() {
      if (!this.focusedPostId) return;

      this.$nextTick(() => {
        window.Events.emit("comments:focus-request", {
          postId: this.focusedPostId,
          commentId: this.focusedCommentId
        });
      });
    },

    privacyLabel(value) {
      switch (value) {
        case "public":
          return "Public";
        case "selected":
          return "Followers only";
        case "private":
          return "Private";
        default:
          return "Unknown";
      }
    },

    isOwnPost(post) {
      return window.currentUser && post.userId === window.currentUser.id;
    },

    async deletePost(post) {
      const confirmed = await window.AppConfirm.open({
        title: "Delete post",
        message: `Are you sure you want to delete the post "${post.title}"?`,
        confirmText: "Delete",
        cancelText: "Cancel",
        danger: true
      });

      if (!confirmed) return;

      try {
        const res = await fetch(`/api/posts/${post.id}`, {
          method: "DELETE",
          headers: {
            "X-CSRF-Token": window.extractCsrfToken()
          }
        });

        if (!res.ok) {
          const err = await res.text();
          alert("Failed to delete post: " + err);
          return;
        }

        window.Events.emit(window.Events.EVENT.POSTS_DELETED, {
          postId: post.id
        });
      } catch (err) {
        console.error("Failed to delete post:", err);
        alert("Network error.");
      }
    },

    navigateToProfile(userId) {
      Router.push("/profile?id=" + userId);
    }
  },

  template: `
    <div>
      <div class="page-content">
        <main class="feed-page">
          <div v-if="posts.length === 0" class="feed-empty">
            No posts yet. Be the first to post!
          </div>

          <div v-for="post in posts" :key="post.id" class="feed-post-card">
            <div class="feed-post-header">
              <div class="feed-post-user-block">
                <div class="feed-post-avatar">
                  <img
                    v-if="post.avatarPath"
                    :src="post.avatarPath"
                    alt="avatar"
                    class="feed-post-avatar-img"
                  />
                  <span v-else>{{ post.firstName ? post.firstName.charAt(0) : "U" }}</span>
                </div>

                <div class="feed-post-user-info">
                  <a
                    class="feed-post-author"
                    :href="'/profile?id=' + post.userId"
                    @click.prevent="navigateToProfile(post.userId)"
                  >
                    {{ post.nickname ? '@' + post.nickname : post.firstName + ' ' + post.lastName }}
                  </a>

                  <span class="feed-post-date"> • {{ new Date(post.createdAt * 1000).toLocaleString() }}</span>
                </div>
              </div>

              <button
                v-if="isOwnPost(post)"
                class="feed-post-delete-btn"
                @click="deletePost(post)"
                title="Delete post"
              >
                <span class="material-symbols-outlined">delete_forever</span>
              </button>
            </div>

            <div class="feed-post-body">
              <h3 class="feed-post-title">{{ post.title }}</h3>
              <p class="feed-post-content">{{ post.content }}</p>

              <div v-if="post.imageUrl" class="feed-post-image-wrap">
                <img :src="post.imageUrl" alt="Post image" class="feed-post-image" />
              </div>
            </div>

            <div class="feed-post-footer">
              <div class="feed-post-meta">{{ privacyLabel(post.privacy) }}</div>
              <CommentSection :post-id="post.id" />
            </div>
          </div>
        </main>
      </div>

      <div v-if="error" class="container error">
        {{ error }}
      </div>
    </div>
  `
};