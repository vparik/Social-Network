window.ProfilePage = {
  name: "ProfilePage",

  data() {
    return {
      profile: null,
      posts: [],
      loading: true,
      error: null,
      showPosts: false,
      isOwnProfile: false,
      isFollowing: false,
      followLoading: false,
    }
  },

  async mounted() {
    try {
      const meRes = await fetch("/api/profile", { method: "GET" });
      if (!meRes.ok) {
        Router.replace("/login");
        return;
      }
      const me = await meRes.json();

      const id = new URLSearchParams(window.location.search).get("id");
      if (id && parseInt(id) !== me.id) {
        const res = await fetch(`/api/profile?id=${id}`, { method: "GET" });
        if (!res.ok) {
          this.error = "Failed to load profile.";
          // this.loading = false;
          return;
        }
        this.profile = await res.json();
        this.isOwnProfile = false;
        await this.loadFollowStatus();
      } else {
        this.profile = me;
        this.isOwnProfile = true;
      }

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

    async loadFollowStatus() {
      try {
        const res = await fetch(`/api/follow/status?id=${this.profile.id}`);
        if (res.ok) {
          const data = await res.json();
          this.isFollowing = data.following;
        }
      } catch (err) {
        console.error("failed to load follow status: ", err)
        // non-critical
      }
    },

    async toggleFollow() {
      if (this.followLoading) return;
      this.followLoading = true;
      try {
        const method = this.isFollowing ? "DELETE" : "POST";
        const res = await fetch(`/api/follow?id=${this.profile.id}`, {
          method,
          headers: { "X-CSRF-Token": window.extractCsrfToken() },
        });

        if (res.ok) {
          this.isFollowing = !this.isFollowing;
          this.profile.followersCount += this.isFollowing ? 1 : -1;
        }
      } catch {
        // non-critical
      } finally {
        this.followLoading = false;
      }
    },

    togglePosts() {
      this.showPosts = !this.showPosts;
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
            <div class="profile-stats">
              <span class="profile-stat"><strong>{{ profile.followersCount }}</strong> Followers</span>
              <span class="profile-stat"><strong>{{ profile.followingCount }}</strong> Following</span>
            </div>
            <button
              v-if="!isOwnProfile"
              class="follow-btn"
              :class="{ following: isFollowing }"
              :disabled="followLoading"
              @click="toggleFollow"
            >
              {{ isFollowing ? 'Unfollow' : 'Follow' }}
            </button>
          </div>
        </div>

        <section class="profile-posts-section">
          <h2
            class="profile-posts-heading"
            @click="posts.length > 0 && togglePosts()"
          >
            Posts
          </h2>

          <div v-if="posts.length === 0" class="feed-empty">
            This user has not posted anything yet.
          </div>

          <div v-else-if="showPosts">
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