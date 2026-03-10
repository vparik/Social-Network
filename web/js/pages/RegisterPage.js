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
          credentials: "include",
          body: JSON.stringify({
            email: this.email,
            password: this.password,
            first_name: this.first_name,
            last_name: this.last_name,
            date_of_birth: this.date_of_birth }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Register Failed")
        }

        Router.push("/login");

      } catch (err) {
        this.error = err.message || "Registration failed";
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
                <input v-model="first_name" type="text">
            </div>

            <div class="form-row">
                <label>Last Name</label>
                <input v-model="last_name" type="text">
            </div>

            <div class="form-row">
                <label>Date of Birth</label>
                <input v-model="date_of_birth" type="date">
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