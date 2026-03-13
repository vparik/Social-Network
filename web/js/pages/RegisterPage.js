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
          const data = await response.json()
          console.error("Registration error:", data.error);
          throw new Error("Something went wrong. Please try again.");
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
                <button :disabled="loading" type="button" @click="loginNavigate">
                    {{ loading ? "Login..." : "Login" }}
                </button>
                <button :disabled="loading" type="submit" @click="submit">
                    {{ loading ? "Registering..." : "Register" }}
                </button>
            </div>
                
            
          <p v-if="error" class="error">{{ error }}</p>
        </form>
      </div>
    </div>
  `
};