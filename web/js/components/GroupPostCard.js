window.GroupPostCard = {
  name: "GroupPostCard",

  props: {
    post: { type: Object, required: true },
    groupId: { type: Number, required: true },
    canDelete: { type: Boolean, default: false }
  },

  emits: ["delete"],

  data() {
    return {
      showComments: false,
      comments: [],
      commentsLoaded: false,
      newComment: "",
      unsubs: []
    };
  },

  mounted() {
    this.unsubs.push(window.Events.on(window.Events.EVENT.GROUP_COMMENT_CREATED, (comment) => {
      if (comment.postId !== this.post.id) return;
      if (!this.comments.find(c => c.id === comment.id)) this.comments.push(comment);
    }));

    this.unsubs.push(window.Events.on(window.Events.EVENT.GROUP_COMMENT_DELETED, (data) => {
      if (data.postId !== this.post.id) return;
      this.comments = this.comments.filter(c => c.id !== data.commentId);
    }));
  },

  beforeUnmount() {
    this.unsubs.forEach(fn => fn());
  },

  methods: {
    async toggleComments() {
      this.showComments = !this.showComments;
      if (this.showComments && !this.commentsLoaded) {
        await this.loadComments();
      }
    },

    async loadComments() {
      const res = await fetch(`/api/groups/${this.groupId}/posts/${this.post.id}/comments`);
      if (res.ok) {
        this.comments = await res.json();
        this.commentsLoaded = true;
      }
    },

    async submitComment() {
      const content = this.newComment.trim();
      if (!content) return;
      const csrf = window.extractCsrfToken();
      const res = await fetch(`/api/groups/${this.groupId}/posts/${this.post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ content })
      });
      if (res.ok) this.newComment = "";
    },

    async deleteComment(comment) {
      const ok = await window.AppConfirm.open({
        title: "Delete comment?",
        message: "This cannot be undone.",
        danger: true,
        confirmText: "Delete"
      });
      if (!ok) return;
      const csrf = window.extractCsrfToken();
      await fetch(`/api/groups/${this.groupId}/comments/${comment.id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrf }
      });
    },

    canDeleteComment(comment) {
      const me = window.Events.state.auth.currentUser;
      return me && comment.userId === me.id;
    },

    authorName(p) {
      return p.nickname ? "@" + p.nickname : `${p.firstName} ${p.lastName}`;
    }
  },

  template: `
    <div>
      <!-- Author header (same as feed) -->
      <div class="feed-post-header">
        <div class="feed-post-user-block">
          <div class="feed-post-avatar">
            {{ post.firstName ? post.firstName.charAt(0).toUpperCase() : 'U' }}
          </div>
          <div class="feed-post-user-info">
            <span class="feed-post-author">{{ authorName(post) }}</span>
            <div class="feed-post-date"> • </div>
            <div class="feed-post-date">{{ new Date(post.createdAt * 1000).toLocaleString() }}</div>
          </div>
        </div>
      </div>

      <!-- Card (same structure as feed-post-card) -->
      <div class="feed-post-card">
        <div class="profile-post-header">
          <h3 class="feed-post-title">{{ post.title }}</h3>
          <div class="feed-post-user-info">
            <button
              v-if="canDelete"
              class="feed-post-delete-btn"
              @click="$emit('delete', post)"
              title="Delete post"
            >🗑️</button>
          </div>
        </div>

        <div class="feed-post-body">
          <p class="feed-post-content">{{ post.content }}</p>
          <div v-if="post.imageUrl" class="feed-post-image-wrap">
            <img :src="post.imageUrl" alt="Post image" class="feed-post-image" />
          </div>
        </div>

        <div class="feed-post-footer">
          <div class="feed-post-meta">Group Post</div>

          <div class="feed-post-comments-box" @click="toggleComments">
            <div class="feed-post-comments-title">
              Comments {{ showComments ? '▲' : '▼' }}
            </div>

            <div v-if="showComments" @click.stop>
              <div v-if="comments.length === 0" class="feed-post-comments-empty">
                No comments yet.
              </div>

              <div v-else class="feed-comments-list">
                <div v-for="comment in comments" :key="comment.id" class="feed-comment">
                  <div class="feed-comment-top">
                    <span class="feed-comment-author">
                      {{ authorName(comment) }}
                    </span>
                    <button
                      v-if="canDeleteComment(comment)"
                      class="feed-delete-icon-btn"
                      @click.stop="deleteComment(comment)"
                      title="Delete comment"
                    >🗑️</button>
                  </div>
                  <span class="feed-comment-content">{{ comment.content }}</span>
                </div>
              </div>

              <div class="feed-comment-input-row">
                <input
                  class="feed-comment-input"
                  type="text"
                  placeholder="Write a comment..."
                  v-model="newComment"
                  @keyup.enter="submitComment"
                />
                <button class="feed-comment-submit" @click="submitComment">Post</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
