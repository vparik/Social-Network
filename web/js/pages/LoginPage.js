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
    async loadCurrentUser() {
      const res = await fetch("/api/profile", { method: "GET" });

      if (!res.ok) {
        throw new Error("Failed to load current user");
      }

      const user = await res.json();

      window.currentUser = user;
      window.Events.auth.setCurrentUser(user);

      return user;
    },

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
            password: this.password
          })
        });

        if (!response.ok) {
          let message = "Login failed";

          try {
            const data = await response.json();
            message = data.error || message;
          } catch {
            const text = await response.text();
            if (text) message = text;
          }

          throw new Error(message);
        }

        await this.loadCurrentUser();
        Router.push("/");
      } catch (err) {
        this.error = err.message || "Login failed";
        console.error(this.error);
      } finally {
        this.loading = false;
      }
    },

    registerNavigate() {
      Router.push("/register");
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

              <p v-if="error" class="error">{{ error }}</p>
            </form>
          </div>
        </section>
      </div>
    </div>
  `
};