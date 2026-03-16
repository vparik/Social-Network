window.HomePage = {
  name: "HomePage",

  data() {
    return {
      isChatSidebarOpen: false,
      activeChatUser: null,
      loading: true,
      error: null,
      posts: []  // holds the list of posts returned by GET /api/posts
    };
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
    // Fetches all public posts from the backend and updates the feed
    async loadPosts() {
      try {
        const res = await fetch("/api/posts", { method: "GET" });
        if (!res.ok) return;
        this.posts = await res.json();
      } catch (err) {
        console.error("Failed to load posts:", err);
      }
    },

    toggleChatSidebar() {
      this.isChatSidebarOpen = !this.isChatSidebarOpen;
    },

    openChatWithUser(user) {
      this.activeChatUser = user;
    },

    closeChatBox() {
      this.activeChatUser = null;
    }
  },

  template: `
    <div>
      <!-- Listen for post-created event from Navbar to refresh the feed -->
      <Navbar @toggle-chat="toggleChatSidebar" @post-created="loadPosts" />

      <div v-if="loading" class="container">Loading...</div>

      <div v-else class="page-content">
        <main class="container">

          <!-- Post feed -->
          <div v-if="posts.length === 0" class="feed-empty">
            No posts yet. Be the first to post!
          </div>

          <div v-for="post in posts" :key="post.id" class="feed-post">
            <h3 class="feed-post-title">{{ post.title }}</h3>
            <p class="feed-post-content">{{ post.content }}</p>
            <span class="feed-post-meta">{{ post.privacy }}</span>
          </div>

        </main>

        <ChatSidebar
          :isOpen="isChatSidebarOpen"
          @close="isChatSidebarOpen = false"
          @select-user="openChatWithUser"
        />

        <ChatBox
          v-if="activeChatUser"
          :user="activeChatUser"
          @close="closeChatBox"
        />
      </div>

      <div v-if="error" class="container error">
        {{ error }}
      </div>
    </div>
  `
};
