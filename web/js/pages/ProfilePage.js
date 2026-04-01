window.ProfilePage = {
  name: "ProfilePage",

  data() {
    return {
      profile: null,
      posts: [],
      loading: true,
      error: null,
      showPosts: true,
      showGroups: true,
      profileGroups: [],
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
      avatarUploading: false,
      showSocialList: false,
      socialListType: "",
      socialListTitle: "",
      socialUsers: [],
      socialLoading: false,
      socialError: null,
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
      await this.loadProfileGroups();
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
      
        window.Events.emit(window.Events.EVENT.NOTIFICATIONS_UPDATED, {
          removeFollowRequestActorId: this.profile.id
        });
      
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
      
        window.Events.emit(window.Events.EVENT.NOTIFICATIONS_UPDATED, {
          removeFollowRequestActorId: this.profile.id
        });
      
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
    async openSocialList(type) {
      if (!this.profile || !this.profile.id) return;
        
      this.showSocialList = true;
      this.socialListType = type;
      this.socialListTitle = type === "followers" ? "Followers" : "Following";
      this.socialUsers = [];
      this.socialError = null;
      this.socialLoading = true;
        
      try {
        const res = await fetch(`/api/${type}?id=${this.profile.id}`, {
          method: "GET"
        });
      
        if (!res.ok) {
          if (res.status === 403) {
            this.socialError = "You are not allowed to view this list.";
          } else {
            this.socialError = "Failed to load users.";
          }
          return;
        }
      
        const data = await res.json();
        this.socialUsers = Array.isArray(data) ? data : [];
      } catch (err) {
        console.error(`failed to load ${type}:`, err);
        this.socialError = "Network error.";
      } finally {
        this.socialLoading = false;
      }
    },

    closeSocialList() {
      this.showSocialList = false;
      this.socialListType = "";
      this.socialListTitle = "";
      this.socialUsers = [];
      this.socialError = null;
      this.socialLoading = false;
    },

    goToUserProfile(userId) {
      this.closeSocialList();
      window.history.pushState({}, "", `/profile?id=${userId}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    togglePosts() {
      this.showPosts = !this.showPosts;
    },

    toggleGroups() {
      this.showGroups = !this.showGroups;
    },

    async loadProfileGroups() {
      if (!this.profile) {
        this.profileGroups = [];
        return;
      }
      try {
        const res = await fetch(`/api/profile/groups?id=${this.profile.id}`);
        if (!res.ok) {
          this.profileGroups = [];
          return;
        }
        const data = await res.json();
        this.profileGroups = Array.isArray(data) ? data : [];
      } catch {
        this.profileGroups = [];
      }
    },

    openGroup(id) {
      window.Router.push("/group?id=" + id);
    },

    memberLabel(group) {
      return group.memberCount === 1 ? "1 member" : `${group.memberCount} members`;
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
      const me = window.Events.state.auth.currentUser;
      return !!me && post.userId === me.id;
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

    resizeAvatar(file, size = 400) {
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          const scale = Math.max(size / img.width, size / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          canvas.toBlob(resolve, "image/jpeg", 0.88);
        };
        img.src = url;
      });
    },

    async uploadAvatar(event) {
      const file = event.target.files[0];
      if (!file) return;
      this.avatarUploading = true;
      try {
        const blob = await this.resizeAvatar(file);
        const fd = new FormData();
        fd.append("file", blob, "avatar.jpg");
        const res = await fetch("/api/upload/avatar", {
          method: "POST",
          headers: { "X-CSRF-Token": window.extractCsrfToken() },
          body: fd
        });
        if (!res.ok) {
          const msg = await res.text();
          alert("Avatar upload failed: " + msg);
          return;
        }
        const data = await res.json();
        // Cache-bust so the browser fetches the new file even if the URL is the same.
        this.profile.avatarPath = data.avatarPath + "?t=" + Date.now();
      } catch (err) {
        alert("Avatar upload failed. Please try again.");
        console.error(err);
      } finally {
        this.avatarUploading = false;
        event.target.value = "";
      }
    },

    async removeAvatar() {
      if (!this.profile.avatarPath || this.avatarUploading) return;
      this.avatarUploading = true;
      try {
        const res = await fetch("/api/upload/avatar", {
          method: "DELETE",
          headers: { "X-CSRF-Token": window.extractCsrfToken() }
        });
        if (!res.ok) {
          const msg = await res.text();
          alert("Failed to remove avatar: " + msg);
          return;
        }
        this.profile.avatarPath = "";
      } catch (err) {
        alert("Failed to remove avatar. Please try again.");
        console.error(err);
      } finally {
        this.avatarUploading = false;
      }
    }
  },

template: `
  <div>
    
    <div v-if="error" class="container error">{{ error }}</div>

    <div v-else-if="!profile"></div>

    <div v-else class="container">
      <div class="profile-header">
        <div :class="['avatar-wrapper', { 'avatar-clickable': isOwnProfile }]">
          <img
            v-if="profile.avatarPath"
            :src="profile.avatarPath"
            class="profile-avatar"
            alt="Avatar"
          />
          <div v-else class="profile-avatar-placeholder">
            {{ profile.firstName[0] }}{{ profile.lastName[0] }}
          </div>
          <div v-if="isOwnProfile" class="avatar-overlay">
            <button
              type="button"
              class="avatar-action-btn"
              :disabled="avatarUploading"
              @click.stop="$refs.avatarInput.click()"
              title="Upload new avatar"
            > <span class="material-symbols-outlined">photo</span>
            </button>
            <button
              v-if="profile.avatarPath"
              type="button"
              class="avatar-action-btn avatar-action-btn--delete"
              :disabled="avatarUploading"
              @click.stop="removeAvatar"
              title="Remove avatar"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <input
            v-if="isOwnProfile"
            type="file"
            ref="avatarInput"
            accept="image/*"
            style="display:none"
            @change="uploadAvatar"
          />
        </div>

        <div class="profile-info">
          <h1>{{ profile.firstName }} {{ profile.lastName }}</h1>
          <p v-if="profile.nickname" class="profile-nickname">@{{ profile.nickname }}</p>

          <p v-if="canViewContent && profile.aboutMe" class="profile-about">
            {{ profile.aboutMe }}
          </p>

          <div class="profile-stats">
            <button
              type="button"
              class="profile-stat profile-stat-btn"
              @click="openSocialList('followers')"
            >
              <strong>{{ profile.followersCount }}</strong> Followers
            </button>

            <button
              type="button"
              class="profile-stat profile-stat-btn"
              @click="openSocialList('following')"
            >
              <strong>{{ profile.followingCount }}</strong> Following
            </button>
          </div>

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

        <div
          v-if="isOwnProfile"
          class="privacy-toggle"
          :class="{ 'is-private': !profile.isPublic, 'is-loading': privacyLoading }"
          @click="!privacyLoading && togglePrivacy()"
          role="switch"
          :aria-checked="!profile.isPublic"
          tabindex="0"
          @keydown.enter.space.prevent="!privacyLoading && togglePrivacy()"
        >
          <div class="privacy-toggle__fill"></div>
          <span class="privacy-toggle__label">{{ profile.isPublic ? 'public' : 'private' }}</span>
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
                    <span class="material-symbols-outlined">delete_forever</span>
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
              <div class="feed-post-meta">{{ privacyLabel(post.privacy) }}</div>
              <CommentSection :post-id="post.id" />
            </div>
          </div>
        </div>
      </section>

      <section class="profile-posts-section">
        <h2
          class="profile-posts-heading"
          @click="profileGroups.length > 0 && toggleGroups()"
        >
          Groups
        </h2>

        <div v-if="profileGroups.length === 0" class="feed-empty">
          This user is not a member of any group.
        </div>

        <div v-else-if="showGroups" class="groups-grid">
          <div
            v-for="group in profileGroups"
            :key="group.id"
            class="group-card"
          >
            <h3 class="group-card__title">{{ group.title }}</h3>
            <p class="group-card__desc">{{ group.description || "No description" }}</p>
            <span class="group-card__meta">{{ memberLabel(group) }}</span>
            <div class="group-card__actions">
              <button
                class="btn btn-primary"
                @click="openGroup(group.id)"
              >View</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div
      v-if="showSocialList"
      class="social-list-overlay"
      @click.self="closeSocialList"
    >
      <div class="social-list-modal">
        <div class="social-list-header">
          <h2>{{ socialListTitle }}</h2>
          <button
            type="button"
            class="social-list-close-btn"
            @click="closeSocialList"
          >
            ✕
          </button>
        </div>

        <div v-if="socialLoading" class="feed-empty">
          Loading...
        </div>

        <div v-else-if="socialError" class="feed-empty">
          {{ socialError }}
        </div>

        <div v-else-if="socialUsers.length === 0" class="feed-empty">
          No users found.
        </div>

        <div v-else class="social-list-users">
          <button
            v-for="user in socialUsers"
            :key="user.id"
            type="button"
            class="social-list-user"
            @click="goToUserProfile(user.id)"
          >
            <img
              v-if="user.avatarPath"
              :src="user.avatarPath"
              class="social-list-user-avatar"
              alt="Avatar"
            />

            <div v-else class="social-list-user-avatar-placeholder">
              {{ user.firstName[0] }}{{ user.lastName[0] }}
            </div>

            <div class="social-list-user-info">
              <div class="social-list-user-name">
                {{ user.firstName }} {{ user.lastName }}
              </div>

              <div v-if="user.nickname" class="social-list-user-nickname">
                @{{ user.nickname }}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
`
};