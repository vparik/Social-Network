window.LoginPage = {
  name: "LoginPage",

  data() {
    return {
      email: "",
      password: "",
      error: "",
      loading: false
    };
  },

  methods: {
    async submit() {
      this.error = "";
      this.loading = true;

      try {
        if (!this.email || !this.password) {
          throw new Error("Email and password required");
        }

        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: this.email, 
            password: this.password }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error)
        }

        Router.push("/");

      } catch (err) {
        this.error = err.message
        console.error(this.error)
      } finally {
        this.loading = false;
      }
    },

    registerNavigate() {
      Router.push("/register")
    }
  },

  template: `
  <div class="auth-page">
    <div class="auth-shell">
      <section class="auth-hero">
        <div class="auth-hero-inner">
          <div class="auth-brand">Social Network</div>

          <h1 class="auth-hero-title">
            Connect, share,<br />
            and belong.
          </h1>

          <p class="auth-hero-text">
            Join Social Network and stay close to the people and moments
            that matter most.
          </p>
        </div>
      </section>

      <section class="auth-panel">
        <div class="auth-card">
          <h1 class="auth-title">Login</h1>
          <p class="auth-switch-text">
            Don't have an account?
            <button type="button" class="auth-switch-link" @click="registerNavigate">
              Register
            </button>
          </p>

          <form class="auth-form" @submit.prevent="submit">
            <div class="auth-field">
              <label>Email</label>
              <input v-model="email" type="email" required />
            </div>

            <div class="auth-field">
              <label>Password</label>
              <input v-model="password" type="password" required />
            </div>

            <button :disabled="loading" type="submit" class="auth-submit-btn">
              {{ loading ? "Signing in..." : "Login" }}
            </button>

            <p v-if="error" class="error">{{ "Login failed" }}</p>
          </form>
        </div>
      </section>
    </div>
  </div>
`
};