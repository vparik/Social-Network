window.HomePage = {
  name: "HomePage",

  data() {
    return {
      loading: true,
      error: null,
      posts: [],
      unsubscribePostCreated: null,
      unsubscribePostDeleted: null
    };
  },

  async mounted() {
    this.unsubscribePostCreated = window.Events.on(
      window.Events.EVENT.POSTS_CREATED,
      (post) => {
        if (!post || !post.id) return;

        const exists = this.posts.some(existing => existing.id === post.id);
        if (exists) return;

        this.posts.unshift(post);
      }
    );

    this.unsubscribePostDeleted = window.Events.on(
      window.Events.EVENT.POSTS_DELETED,
      ({ postId }) => {
        if (!postId) return;
        this.posts = this.posts.filter(post => post.id !== postId);
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

  beforeUnmount() {
    if (this.unsubscribePostCreated) {
      this.unsubscribePostCreated();
      this.unsubscribePostCreated = null;
    }

    if (this.unsubscribePostDeleted) {
      this.unsubscribePostDeleted();
      this.unsubscribePostDeleted = null;
    }
  },

  methods: {
    async loadPosts() {
      try {
        const res = await fetch("/api/posts", { method: "GET" });
        if (!res.ok) return;

        this.posts = await res.json();
      } catch (err) {
        console.error("Failed to load posts:", err);
      }
    },

    isOwnPost(post) {
      return window.currentUser && post.userId === window.currentUser.id;
    },

    async deletePost(post) {
      const confirmed = window.confirm(
        `Are you sure that you want to delete the post "${post.title}" ?`
      );

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
      <div v-if="loading" class="container">Loading...</div>

      <div v-else class="page-content">
        <main class="feed-page">
          <div v-if="posts.length === 0" class="feed-empty">
            No posts yet. Be the first to post!
          </div>

          <div v-for="post in posts" :key="post.id">
            <div class="feed-post-header">
              <div class="feed-post-user-block">
                <div class="feed-post-avatar">
                  {{ post.firstName ? post.firstName.charAt(0) : "U" }}
                </div>

                <div class="feed-post-user-info">
                  <a
                    class="feed-post-author"
                    :href="'/profile?id=' + post.userId"
                    @click.prevent="navigateToProfile(post.userId)"
                  >
                    {{ post.nickname ? '@' + post.nickname : post.firstName + ' ' + post.lastName }}
                  </a>

                  <div class="feed-post-date"> • </div>

                  <div class="feed-post-date">
                    {{ new Date(post.createdAt * 1000).toLocaleString() }}
                  </div>
                </div>
              </div>
            </div>

            <div class="feed-post-card">
              <div class="profile-post-header">
                <h3 class="feed-post-title">{{ post.title }}</h3>

                <div class="feed-post-user-info">
                  <button
                    v-if="isOwnPost(post)"
                    class="feed-post-delete-btn"
                    @click="deletePost(post)"
                    title="Delete post"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div class="feed-post-body">
                <p class="feed-post-content">{{ post.content }}</p>

                <div v-if="post.imageUrl" class="feed-post-image-wrap">
                  <img :src="post.imageUrl" alt="Post image" class="feed-post-image" />
                </div>
              </div>

              <div class="feed-post-footer">
                <div class="feed-post-meta">{{ post.privacy }}</div>
                <CommentSection :post-id="post.id" />
              </div>
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