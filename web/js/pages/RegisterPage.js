window.RegisterPage = {
  name: "RegisterPage",

  data() {
    return {
      email: "",
      password: "",
      showPassword: false,
      firstName: "",
      lastName: "",
      dateOfBirth: "",
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

        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: this.email,
            password: this.password,
            first_name: this.firstName,
            last_name: this.lastName,
            date_of_birth: this.dateOfBirth
          })
        });

        if (!response.ok) {
          let message = "Something went wrong. Please try again.";

          try {
            const data = await response.json();
            message = data.error || message;
          } catch {
            message = await response.text();
          }

          console.error("Registration error:", message);
          throw new Error(message);
        }

        Router.push("/login");
      } catch (err) {
        this.error = err.message || "Registration failed";
      } finally {
        this.loading = false;
      }
    },

    loginNavigate() {
      Router.push("/login");
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
            <h1 class="auth-title">Register</h1>
            <p class="auth-switch-text">
              Already have an account?
              <button type="button" class="auth-switch-link" @click="loginNavigate">
                Login
              </button>
            </p>

            <form class="auth-form" @submit.prevent="submit">
              <div class="auth-field">
                <label>First name</label>
                <input v-model="firstName" type="text" required />
              </div>

              <div class="auth-field">
                <label>Last name</label>
                <input v-model="lastName" type="text" required />
              </div>

              <div class="auth-field">
                <label>Date of birth</label>
                <input v-model="dateOfBirth" type="date" required />
              </div>

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
                {{ loading ? "Creating account..." : "Register" }}
              </button>

              <p v-if="error" class="error">{{ error }}</p>
            </form>
          </div>
        </section>
      </div>
    </div>
  `
};