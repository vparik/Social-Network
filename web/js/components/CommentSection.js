window.CommentSection = {
  name: "CommentSection",

  // postId is passed in from the parent (HomePage or ProfilePage)
  // The component owns all comment state internally — the parent doesn't need to know anything
  props: ["postId"],

  data() {
    return {
      comments: [],
      commentInput: "",
      isOpen: false,
      loaded: false
    };
  },

  methods: {
    async toggle() {
      this.isOpen = !this.isOpen;
      // Fetch only once — on first open
      if (this.isOpen && !this.loaded) {
        await this.loadComments();
      }
    },

    async loadComments() {
      try {
        const res = await fetch(`/api/posts/${this.postId}/comments`);
        if (res.ok) {
          this.comments = await res.json();
          this.loaded = true;
        }
      } catch (err) {
        console.error("Failed to load comments:", err);
      }
    },

    async submitComment() {
      const content = this.commentInput.trim();
      if (!content) return;

      try {
        const res = await fetch(`/api/posts/${this.postId}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": window.extractCsrfToken()
          },
          body: JSON.stringify({ content })
        });

        if (res.ok) {
          const comment = await res.json();
          // Push the returned full comment object directly — no re-fetch
          this.comments.push(comment);
          this.commentInput = "";
        }
      } catch (err) {
        console.error("Failed to submit comment:", err);
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
            @keyup.enter="submitComment"
          />
          <button class="feed-comment-submit" @click="submitComment">Post</button>
        </div>
      </div>
    </div>
  `
};
