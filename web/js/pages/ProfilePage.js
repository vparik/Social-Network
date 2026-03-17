window.ProfilePage = {
  name: "ProfilePage",

  data() {
    return {
      profile: null,
      posts: [],
      loading: true,
      error: null,
      showPosts: false,
    }
  },

  async mounted() {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      const url = id ? `/api/profile?id=${id}` : "/api/profile?id=me";

      const res = await fetch(url, { method: "GET" });

      if (!res.ok) {
        this.error = "Failed to load profile.";
        this.loading = false;
        Router.replace("/login");
        return;
      }

      this.profile = await res.json();
      await this.loadProfilePosts();
      this.loading = false;
    } catch {
      this.error = "Network error.";
      this.loading = false;
    }
  },

  methods: {
    async loadProfilePosts() {
      try {
        const res = await fetch("/api/posts", { method: "GET" });
        if (!res.ok) {
          this.posts = [];
          return;
        }

        const allPosts = await res.json();
        this.posts = allPosts.filter(
          (post) => post.userId === this.profile.id
        );
      } catch {
        this.posts = [];
      }
    },

    revealPosts() {
      this.showPosts = true
    }
  },

  template: `
    <div>
      <div v-if="loading" class="container">Loading...</div>
      <div v-else-if="error" class="container error">{{ error }}</div>
      <div v-else class="container">
        <div class="profile-header">
          <img
            v-if="profile.avatarPath"
            :src="profile.avatarPath"
            class="profile-avatar"
            alt="Avatar"
          />
          <div v-else class="profile-avatar-placeholder">
            {{ profile.firstName[0] }}{{ profile.lastName[0] }}
          </div>
          <div class="profile-info">
            <h1>{{ profile.firstName }} {{ profile.lastName }}</h1>
            <p v-if="profile.nickname" class="profile-nickname">@{{ profile.nickname }}</p>
            <p v-if="profile.aboutMe" class="profile-about">{{ profile.aboutMe }}</p>
          </div>
        </div>

        <section class="profile-posts-section">
          <h2 class="profile-posts-heading">Posts</h2>

          <div v-if="posts.length === 0" class="feed-empty">
            This user has not posted anything yet.
          </div>

          <button
            v-else-if="!showPosts"
            class="load-posts-btn"
            @click="revealPosts"
          >
            Load Posts
          </button>

          <div v-else>
            <div v-for="post in posts" :key="post.id" class="feed-post-card profile-post-card">
              <div class="profile-post-header">
                <div class="feed-post-user-block">
                  <div class="feed-post-user-info">
                    <div class="feed-post-date">
                      {{ new Date(post.createdAt * 1000).toLocaleString() }}
                    </div>
                  </div>
                </div>
              </div>

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

        </section>
      </div>
    </div>
  `
};