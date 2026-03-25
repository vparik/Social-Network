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
      unsubscribeCommentsCreated: null
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
    }
  },

  beforeUnmount() {
    if (this.unsubscribeCommentsCreated) {
      this.unsubscribeCommentsCreated();
      this.unsubscribeCommentsCreated = null;
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
    }
  },

  template: `
    <div class="feed-post-comments-box">
      <div class="feed-post-comments-title" @click="toggle">
        Comments {{ isOpen ? '▲' : '▼' }}
      </div>

      <div v-if="isOpen">
        <div v-if="comments.length === 0" class="feed-post-comments-empty">
          No comments yet.
        </div>

        <div v-for="comment in comments" :key="comment.id" class="feed-comment">
          <span class="feed-comment-author">
            {{ comment.nickname ? '@' + comment.nickname : comment.firstName + ' ' + comment.lastName }}
          </span>
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