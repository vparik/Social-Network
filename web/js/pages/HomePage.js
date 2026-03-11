window.HomePage = {
  name: "HomePage",

  data() {
    return {
      isChatSidebarOpen: false,
      activeChatUser: null,
      loading: true,
      error: null
      
    };
  },

  async mounted() {
    try {
      const res = await fetch("/api/home", { method: "GET" });

      if (!res.ok) {
        Router.replace("/login");
        this.loading = false;
    
        return
      }

      this.loading = false;

    } catch {
      this.error = "Failed to load session";
      console.warn("API unavailable (dev mode)");
      this.loading = false;
    }
  },

  methods: {
    async logout() {
      await fetch("/api/logout", { method: "POST" });
      Router.push("/login");
    },

    toggleChatSidebar() {
      console.log("chat toggle");
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
      <Navbar @toggle-chat="toggleChatSidebar" />
      <div v-if="loading" class="container">Loading...</div>
      <div v-else class="page-content">
        <main class=container>
          <h1>Welcome to the Social Network!</h1>
          <p>This is your SPA homepage.</p>
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