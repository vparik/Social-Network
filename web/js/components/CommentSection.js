window.CommentSection = {
  name: "CommentSection",

  props: {
    postId: {
      type: Number,
      required: true
    }
  },

  data() {
    return {
      comments: [],
      commentInput: "",
      isOpen: false,
      loaded: false,
      loadingComments: false,
      submittingComment: false,
      unsubscribeCommentsCreated: null,
      unsubscribeCommentsDeleted: null,
      unsubscribeFocusRequest: null
    };
  },

  mounted() {
    if (window.Events) {
      this.unsubscribeCommentsCreated = window.Events.on(
        window.Events.EVENT.COMMENTS_CREATED,
        ({ postId, comment }) => {
          if (postId !== this.postId || !comment || !comment.id) return;

          const exists = this.comments.some(existing => existing.id === comment.id);
          if (exists) return;

          this.comments.push(comment);
          this.loaded = true;
        }
      );

      this.unsubscribeCommentsDeleted = window.Events.on(
        window.Events.EVENT.COMMENTS_DELETED,
        ({ postId, commentId }) => {
          if (postId !== this.postId || !commentId) return;

          this.comments = this.comments.filter(
            existing => existing.id !== commentId
          );
        }
      );

      this.unsubscribeFocusRequest = window.Events.on(
        "comments:focus-request",
        async ({ postId, commentId }) => {
          if (postId !== this.postId) return;

          if (!this.isOpen) {
            this.isOpen = true;
          }

          if (!this.loaded) {
            await this.loadComments();
          }

          this.$nextTick(() => {
            if (!commentId) return;

            const el = document.getElementById(`comment-${commentId}`);
            if (!el) return;

            el.scrollIntoView({
              behavior: "smooth",
              block: "center"
            });

            el.classList.add("comment-focus-highlight");

            setTimeout(() => {
              el.classList.remove("comment-focus-highlight");
            }, 2000);
          });
        }
      );
    }
  },

  beforeUnmount() {
    if (this.unsubscribeCommentsCreated) {
      this.unsubscribeCommentsCreated();
      this.unsubscribeCommentsCreated = null;
    }

    if (this.unsubscribeCommentsDeleted) {
      this.unsubscribeCommentsDeleted();
      this.unsubscribeCommentsDeleted = null;
    }

    if (this.unsubscribeFocusRequest) {
      this.unsubscribeFocusRequest();
      this.unsubscribeFocusRequest = null;
    }
  },

  methods: {
    async toggle() {
      this.isOpen = !this.isOpen;

      if (this.isOpen && !this.loaded) {
        await this.loadComments();
      }
    },

    async loadComments() {
      if (this.loadingComments) return;

      this.loadingComments = true;

      try {
        const res = await fetch(`/api/posts/${this.postId}/comments`);

        if (!res.ok) {
          return;
        }

        this.comments = await res.json();
        this.loaded = true;
      } catch (err) {
        console.error("Failed to load comments:", err);
      } finally {
        this.loadingComments = false;
      }
    },

    async submitComment() {
      const content = this.commentInput.trim();
      if (!content || this.submittingComment) return;

      this.submittingComment = true;

      try {
        const res = await fetch(`/api/posts/${this.postId}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": window.extractCsrfToken()
          },
          body: JSON.stringify({ content })
        });

        if (!res.ok) {
          return;
        }

        const comment = await res.json();

        this.commentInput = "";
        this.loaded = true;

        if (window.Events) {
          window.Events.emit(window.Events.EVENT.COMMENTS_CREATED, {
            postId: this.postId,
            comment
          });
        }
      } catch (err) {
        console.error("Failed to submit comment:", err);
      } finally {
        this.submittingComment = false;
      }
    },

    isOwnComment(comment) {
      return window.currentUser && comment.userId === window.currentUser.id;
    },

    async deleteComment(comment) {
      if (!comment || !comment.id) return;

      const confirmed = await window.AppConfirm.open({
        title: "Delete comment",
        message: "Are you sure you want to delete this comment?",
        confirmText: "Delete",
        cancelText: "Cancel",
        danger: true
      });

      if (!confirmed) return;

      try {
        const res = await fetch(`/api/comments/${comment.id}`, {
          method: "DELETE",
          headers: {
            "X-CSRF-Token": window.extractCsrfToken()
          }
        });

        if (!res.ok) {
          const err = await res.text();
          alert("Failed to delete comment: " + err);
          return;
        }

        if (window.Events) {
          window.Events.emit(window.Events.EVENT.COMMENTS_DELETED, {
            postId: this.postId,
            commentId: comment.id
          });
        }
      } catch (err) {
        console.error("Failed to delete comment:", err);
        alert("Network error.");
      }
    }
  },

  template: `
    <div class="feed-post-comments-box" @click="toggle">
      <div class="feed-post-comments-title">
        Comments {{ isOpen ? '▲' : '▼' }}
      </div>

      <div v-if="isOpen" @click.stop>
        <div v-if="comments.length === 0" class="feed-post-comments-empty">
          No comments yet.
        </div>

        <div
          v-for="comment in comments"
          :key="comment.id"
          :id="'comment-' + comment.id"
          class="feed-comment"
        >
          <div class="feed-comment-top">
            <span class="feed-comment-author">
              {{ comment.nickname ? '@' + comment.nickname : comment.firstName + ' ' + comment.lastName }}
            </span>

            <button
              v-if="isOwnComment(comment)"
              class="feed-delete-icon-btn"
              @click.stop="deleteComment(comment)"
              title="Delete comment"
              aria-label="Delete comment"
            >
             🗑️
            </button>
          </div>

          <span class="feed-comment-content">{{ comment.content }}</span>
        </div>

        <div class="feed-comment-input-row">
          <input
            class="feed-comment-input"
            type="text"
            placeholder="Write a comment..."
            v-model="commentInput"
            :disabled="submittingComment"
            @keyup.enter="submitComment"
          />
          <button
            class="feed-comment-submit"
            :disabled="submittingComment"
            @click="submitComment"
          >
            {{ submittingComment ? "Posting..." : "Post" }}
          </button>
        </div>
      </div>
    </div>
  `
};