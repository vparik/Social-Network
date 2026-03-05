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
        // Replace with real API call later
        if (!this.email || !this.password) {
          throw new Error("Email and password required");
        }

        // Simulate success
        Router.push("/register");

      } catch (err) {
        this.error = err.message || "Registration failed";
      } finally {
        this.loading = false;
      }
    }
  },

  template: `
    <div class="centered">
      <div class="card">
        <h1>Register</h1>

        <form @submit.prevent="submit">
            <div class="form-row">
                <label>First Name</label>
                <input v-model="firstName" type="text">
            </div>

            <div class="form-row">
                <label>Last Name</label>
                <input v-model="lastName" type="text">
            </div>

            <div class="form-row">
                <label>Date of Birth</label>
                <input v-model="dateOfBirth" type="date">
            </div>

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
                    {{ loading ? "Registering..." : "Register" }}
                </button>
                <button :disabled="loading" type="Register">
                    {{ loading ? "Login..." : "Login" }}
                </button>
            </div>
                
            
          <p v-if="error" class="error">{{ error }}</p>
        </form>
      </div>
    </div>
  `
};