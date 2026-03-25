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
      isRequested: false,
      hasIncomingRequest: false,
      canViewContent: false,
      followLoading: false,
      privacyLoading: false,
      unsubscribePostCreated: null,
      unsubscribePostDeleted: null,
      unsubscribeRelationshipChanged: null,
      unsubscribePrivacyChanged: null,
    };
  },

  async mounted() {
    this.unsubscribePrivacyChanged = window.Events.on(
      window.Events.EVENT.PROFILE_PRIVACY_CHANGED,
      async (data) => {
        if (!this.profile || !this.profile.id || !data) return;
        if (data.userId !== this.profile.id) return;

        await this.refreshProfile();
        await this.loadProfilePosts();
      }
    );

    this.unsubscribePostCreated = window.Events.on(
      window.Events.EVENT.POSTS_CREATED,
      (post) => {
        if (!post || !post.id || !this.profile) return;
        if (!this.canViewContent) return;
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

    this.unsubscribeRelationshipChanged = window.Events.on(
      window.Events.EVENT.PROFILE_FOLLOW_CHANGED,
      async (data) => {
        if (!this.profile || !this.profile.id || !data) return;

        const touchesCurrentProfile =
          data.actorId === this.profile.id || data.targetId === this.profile.id;

        if (!touchesCurrentProfile) return;

        await this.refreshProfile();

        if (!this.isOwnProfile) {
          await this.loadFollowStatus();
        }

        await this.loadProfilePosts();
      }
    );

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
        await this.fetchProfile(id);
        await this.loadFollowStatus();
      } else {
        this.profile = me;
        this.isOwnProfile = true;
        this.canViewContent = true;
        this.isFollowing = false;
        this.isRequested = false;
        this.hasIncomingRequest = false;
      }

      await this.loadProfilePosts();
      this.loading = false;
    } catch (err) {
      this.error = "Network error.";
      this.loading = false;
    }
  },

  beforeUnmount() {
    if (this.unsubscribePrivacyChanged) {
      this.unsubscribePrivacyChanged();
      this.unsubscribePrivacyChanged = null;
    }

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
    async fetchProfile(id) {
      const res = await fetch(`/api/profile?id=${id}`, { method: "GET" });

      if (!res.ok) {
        this.error = "Failed to load profile.";
        return false;
      }

      const data = await res.json();

      this.profile = data.user;
      this.isOwnProfile = !!data.isOwnProfile;
      this.canViewContent = !!data.canViewContent;
      this.isFollowing = !!data.relationship?.following;
      this.isRequested = !!data.relationship?.requested;
      this.hasIncomingRequest = !!data.relationship?.incomingRequest;

      return true;
    },

    async togglePrivacy() {
      if (!this.isOwnProfile || !this.profile || this.privacyLoading) return;

      this.privacyLoading = true;

      try {
        const res = await fetch("/api/profile/privacy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": window.extractCsrfToken()
          },
          body: JSON.stringify({
            isPublic: !this.profile.isPublic
          })
        });

        if (!res.ok) {
          const err = await res.text();
          console.error("failed to update privacy:", err);
          return;
        }

        const updated = await res.json();
        this.profile = updated;
        this.canViewContent = true;

        if (window.Events?.state?.auth?.currentUser?.id === updated.id) {
          window.Events.auth.setCurrentUser(updated);
        }

        await this.loadProfilePosts();
      } catch (err) {
        console.error("failed to update privacy:", err);
      } finally {
        this.privacyLoading = false;
      }
    },

    async loadProfilePosts() {
      if (!this.profile) {
        this.posts = [];
        return;
      }

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

        if (!this.canViewContent && !this.isOwnProfile) {
          this.posts = [];
        }
      } catch {
        this.posts = [];
      }
    },

    async refreshProfile() {
      if (!this.profile || !this.profile.id) return;

      try {
        const ok = await this.fetchProfile(this.profile.id);
        if (!ok) return;
      } catch (err) {
        console.error("failed to refresh profile:", err);
      }
    },

    async loadFollowStatus() {
      if (!this.profile || !this.profile.id || this.isOwnProfile) return;

      try {
        const res = await fetch(`/api/follow/status?id=${this.profile.id}`);

        if (res.ok) {
          const data = await res.json();
          this.isFollowing = !!data.following;
          this.isRequested = !!data.requested;
          this.hasIncomingRequest = !!data.incomingRequest;
        }
      } catch (err) {
        console.error("failed to load follow status:", err);
      }
    },

    async toggleFollow() {
      if (this.followLoading || !this.profile || !this.profile.id) return;

      this.followLoading = true;

      try {
        const method = (this.isFollowing || this.isRequested) ? "DELETE" : "POST";

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

        await this.loadProfilePosts();
      } catch (err) {
        console.error("failed to toggle follow:", err);
      } finally {
        this.followLoading = false;
      }
    },

    async acceptIncomingRequest() {
      if (this.followLoading || !this.profile || !this.profile.id) return;

      this.followLoading = true;

      try {
        const res = await fetch(`/api/follow/accept?id=${this.profile.id}`, {
          method: "POST",
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

        await this.loadProfilePosts();
      } catch (err) {
        console.error("failed to accept follow request:", err);
      } finally {
        this.followLoading = false;
      }
    },

    async rejectIncomingRequest() {
      if (this.followLoading || !this.profile || !this.profile.id) return;

      this.followLoading = true;

      try {
        const res = await fetch(`/api/follow/request?id=${this.profile.id}`, {
          method: "DELETE",
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

        await this.loadProfilePosts();
      } catch (err) {
        console.error("failed to reject follow request:", err);
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

            <p v-if="canViewContent && profile.aboutMe" class="profile-about">
              {{ profile.aboutMe }}
            </p>

            <div class="profile-stats">
              <span class="profile-stat">
                <strong>{{ profile.followersCount }}</strong> Followers
              </span>
              <span class="profile-stat">
                <strong>{{ profile.followingCount }}</strong> Following
              </span>
            </div>

            <button
              v-if="isOwnProfile"
              class="follow-btn"
              :disabled="privacyLoading"
              @click="togglePrivacy"
            >
              {{ profile.isPublic ? 'Make Private' : 'Make Public' }}
            </button>

            <template v-if="!isOwnProfile">
              <div v-if="hasIncomingRequest" class="profile-follow-actions">
                <button
                  class="follow-btn"
                  :disabled="followLoading"
                  @click="acceptIncomingRequest"
                >
                  Accept
                </button>

                <button
                  class="follow-btn following"
                  :disabled="followLoading"
                  @click="rejectIncomingRequest"
                >
                  Decline
                </button>
              </div>

              <button
                v-else
                class="follow-btn"
                :class="{ following: isFollowing || isRequested }"
                :disabled="followLoading"
                @click="toggleFollow"
              >
                {{ isFollowing ? 'Unfollow' : isRequested ? 'Requested' : 'Follow' }}
              </button>
            </template>
          </div>
        </div>

        <div
          v-if="!canViewContent && !isOwnProfile"
          class="feed-empty"
        >
          This account is private. Follow to see posts and profile details.
        </div>

        <section v-else class="profile-posts-section">
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