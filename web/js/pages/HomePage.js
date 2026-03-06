window.HomePage = {
  name: "HomePage",

  data() {
    return {
      loading: true,
      error: ""
    };
  },

  async mounted() {
    try {
      const res = await fetch("/api/home");

      if (!res.ok) {
        Router.replace("/login");
        return;
      }

      this.loading = false;

    } catch {
      this.error = "Failed to load session";
    }
  },

  methods: {
    async logout() {
      await fetch("/api/logout", { method: "POST" });
      Router.replace("/login");
    }
  },

  template: `
    <div v-if="loading">Loading...</div>

    <div v-else>
      <header class="topbar">
        <h2>Home</h2>
        <button @click="logout">Logout</button>
      </header>

      <main class="container">
        <h1>Welcome to the Social Network</h1>
        <p>This is your SPA home page.</p>
      </main>
    </div>
  `
};