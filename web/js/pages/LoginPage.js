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
        // Replace with real API call later
        if (!this.email || !this.password) {
          throw new Error("Email and password required");
        }

        // Simulate success
        Router.push("/login");

      } catch (err) {
        this.error = err.message || "Login failed";
      } finally {
        this.loading = false;
      }
    }
  },

  template: `
    <div class="centered">
      <div class="card">
        <h1>Login</h1>

        <form @submit.prevent="submit">
            <div class="form-row">
                <label>Email</label>
                <input v-model="email" type="email">
            </div>

            <div class="form-row">
                <label>Password</label>
                <input v-model="password" type="password">
            </div>
            
            <div class="actions">
                <button :disabled="loading" type="submit">
                    {{ loading ? "Signing in..." : "Login" }}
                </button>
                <button :disabled="loading" type="Register">
                    {{ loading ? "Registering..." : "Register" }}
                </button>
            </div>
                
            
          <p v-if="error" class="error">{{ error }}</p>
        </form>
      </div>
    </div>
  `
};