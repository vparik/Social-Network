window.HomePage = {
  name: "HomePage",

  props: ["postRefreshTick"],

  data() {
    return {
      loading: true,
      error: null,
      posts: []
    };
  },

  watch: {
    postRefreshTick() {
      this.loadPosts();
    }
  },

  async mounted() {
    try {
      // Verify the session is valid — redirect to login if not
      const res = await fetch("/api/home", { method: "GET" });

      if (!res.ok) {
        Router.replace("/login");
        this.loading = false;
        return;
      }

      this.loading = false;

      // Load the initial post feed
      await this.loadPosts();

    } catch {
      this.error = "Failed to load session";
      console.warn("API unavailable (dev mode)");
      this.loading = false;
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
                <div class="feed-post-author">
                  {{ post.firstName }} {{ post.lastName }} 
                </div>
                <div class="feed-post-date"> • </div>
                <div class="feed-post-date">
                  {{ new Date(post.createdAt * 1000).toLocaleString() }}
                </div>
              </div>
            </div>
          </div>

          <div class="feed-post-card">
            <div class="feed-post-body">
              <h3 class="feed-post-title">{{ post.title }}</h3>
              <p class="feed-post-content">{{ post.content }}</p>

              <div v-if="post.imageUrl" class="feed-post-image-wrap">
                <img :src="post.imageUrl" alt="Post image" class="feed-post-image" />
              </div>
            </div>

            <div class="feed-post-footer">
              <div class="feed-post-meta">{{ post.privacy }}</div>

              <div class="feed-post-comments-box">
                <div class="feed-post-comments-title">Comments</div>
                <div class="feed-post-comments-empty">
                  Comments will go here next.
                </div>
              </div>
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
