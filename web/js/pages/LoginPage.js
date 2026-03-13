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
    <div class="centered">
      <div class="card">
        <h1>Login</h1>

        <form @submit.prevent="submit">
            <div class="form-row">
                <label>Email</label>
                <input v-model="email" type="email" required>
            </div>

            <div class="form-row">
                <label>Password</label>
                <input v-model="password" type="password" required>
            </div>
            
            <div class="actions">
                <button :disabled="loading" type="button" @click="registerNavigate">
                    {{ loading ? "Registering..." : "Register" }}
                </button>
                <button :disabled="loading" type="submit" @click=submit>
                    {{ loading ? "Signing in..." : "Login" }}
                </button> 
            </div>
                
            
          <p v-if="error" class="error">{{ "Login failed" }}</p>
        </form>
      </div>
    </div>
  `
};