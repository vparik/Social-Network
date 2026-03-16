window.RegisterPage = {
  name: "RegisterPage",

  data() {
    return {
      email: "",
      password: "",
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
        
        const response= await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: this.email,
            password: this.password,
            first_name: this.firstName,
            last_name: this.lastName,
            date_of_birth: this.dateOfBirth }),
        })

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
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    loginNavigate() {
      Router.push("/login")
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
              <input v-model="password" type="password" required />
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