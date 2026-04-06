window.LoginPage = {
  name: "LoginPage",

  data() {
    return {
      email: "",
      password: "",
      showPassword: false,
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
      if (response.status === 401) {
        throw new Error("No account found with these credentials");
      }

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

    // Confirm pending avatar from registration if present
    const tempPath = sessionStorage.getItem("pendingAvatarTempPath");
    if (tempPath) {
      sessionStorage.removeItem("pendingAvatarTempPath");
      await fetch("/api/upload/avatar/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": window.extractCsrfToken()
        },
        body: JSON.stringify({ tempPath })
      });
    }

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
              Connect, share, belong.
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
                <div class="auth-input-wrapper">
                  <input v-model="password" :type="showPassword ? 'text' : 'password'" required />
                  <button type="button" class="auth-show-password" @click="showPassword = !showPassword" :aria-label="showPassword ? 'Hide password' : 'Show password'">
                    <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </button>
                </div>
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