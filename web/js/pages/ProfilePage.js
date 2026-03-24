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
      unsubscribePostCreated: null,
      unsubscribePostDeleted: null,
      unsubscribeRelationshipChanged: null
    };
  },

  async mounted() {
    this.unsubscribePostCreated = window.Events.on(
      window.Events.EVENT.POSTS_CREATED,
      (post) => {
        if (!post || !post.id || !this.profile) return;
        if (post.userId !== this.profile.id) return;

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

    this.unsubscribeRelationshipChanged = window.MockChat.subscribe((event) => {
      if (event.type !== "relationship_changed") return;
      if (!this.profile || !this.profile.id) return;

      const data = event.data;
      if (!data) return;

      const touchesCurrentProfile =
        data.actorId === this.profile.id || data.targetId === this.profile.id;

      if (!touchesCurrentProfile) return;

      this.refreshProfile();

      if (!this.isOwnProfile) {
        this.loadFollowStatus();
      }
    });

    try {
      let me = window.Events.state.auth.currentUser;

      if (!me) {
        me = await new Promise((resolve, reject) => {
          const unsubscribe = window.Events.on(
            window.Events.EVENT.AUTH_USER_READY,
            ({ user }) => {
              unsubscribe();

              if (!user) {
                reject(new Error("failed_to_load_current_user"));
                return;
              }

              resolve(user);
            }
          );
        });
      }

      const id = new URLSearchParams(window.location.search).get("id");

      if (id && parseInt(id, 10) !== me.id) {
        const res = await fetch(`/api/profile?id=${id}`, { method: "GET" });

        if (!res.ok) {
          this.error = "Failed to load profile.";
          this.loading = false;
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
    } catch (err) {
      this.error = "Network error.";
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

    if (this.unsubscribeRelationshipChanged) {
      this.unsubscribeRelationshipChanged();
      this.unsubscribeRelationshipChanged = null;
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
          post => this.profile && post.userId === this.profile.id
        );
      } catch {
        this.posts = [];
      }
    },

    async refreshProfile() {
      if (!this.profile || !this.profile.id) return;

      try {
        const res = await fetch(`/api/profile?id=${this.profile.id}`, { method: "GET" });

        if (!res.ok) return;

        const freshProfile = await res.json();
        this.profile = freshProfile;
      } catch (err) {
        console.error("failed to refresh profile:", err);
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
        console.error("failed to load follow status:", err);
      }
    },

    async toggleFollow() {
      if (this.followLoading || !this.profile || !this.profile.id) return;

      this.followLoading = true;

      try {
        const method = this.isFollowing ? "DELETE" : "POST";

        const res = await fetch(`/api/follow?id=${this.profile.id}`, {
          method,
          headers: {
            "X-CSRF-Token": window.extractCsrfToken()
          }
        });

        if (!res.ok) {
          return;
        }

        await Promise.all([
          this.refreshProfile(),
          this.loadFollowStatus()
        ]);

        window.Events.emit(window.Events.EVENT.PROFILE_FOLLOW_CHANGED, {
          profileId: this.profile.id,
          isFollowing: this.isFollowing
        });
      } catch (err) {
        console.error("failed to toggle follow:", err);
      } finally {
        this.followLoading = false;
      }
    },

    togglePosts() {
      this.showPosts = !this.showPosts;
    },

    isOwnPost(post) {
      const me = window.Events.state.auth.currentUser;
      return !!me && post.userId === me.id;
    },

    async deletePost(post) {
      const confirmed = window.confirm(
        `Are you sure you want to delete the post "${post.title}" ?`
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

        this.posts = this.posts.filter(existing => existing.id !== post.id);

        window.Events.emit(window.Events.EVENT.POSTS_DELETED, {
          postId: post.id
        });
      } catch (err) {
        console.error("Failed to delete post:", err);
        alert("Network error.");
      }
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
              <span class="profile-stat">
                <strong>{{ profile.followersCount }}</strong> Followers
              </span>
              <span class="profile-stat">
                <strong>{{ profile.followingCount }}</strong> Following
              </span>
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
            <div
              v-for="post in posts"
              :key="post.id"
              class="feed-post-card profile-post-card"
            >
              <div class="profile-post-header">
                <h3 class="feed-post-title">{{ post.title }}</h3>

                <div class="feed-post-user-block">
                  <div class="feed-post-user-info">
                    <div class="feed-post-date">
                      {{ new Date(post.createdAt * 1000).toLocaleString() }}
                    </div>

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
        </section>
      </div>
    </div>
  `
};