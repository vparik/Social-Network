window.HomePage = {
  name: "HomePage",

  methods: {
    logout() {
      Router.push("/");
    }
  },

  template: `
    <div>
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