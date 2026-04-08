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
      nickname: "",
      aboutMe: "",
      avatarFile: null,
      avatarPreview: null,
      error: "",
      loading: false
    };
  },

  computed: {
    maxDate() {
      return new Date().toISOString().split("T")[0];
    }
  },
  methods: {
    async submit() {
      this.error = "";
      this.loading = true;

      try {
        if (!this.email || !this.password) {
          throw new Error("Email and password required");
        }

        // 1. Upload to temp (no auth needed)
        if (this.avatarFile) {
          const formData = new FormData();
          formData.append("file", this.avatarFile);

          const uploadRes = await fetch("/api/upload/avatar/temp", {
            method: "POST",
            body: formData
          });

          if (!uploadRes.ok) throw new Error("Avatar upload failed");
          const uploadData = await uploadRes.json();

          // Stash it for after login
          if (uploadData.tempPath) {
            sessionStorage.setItem("pendingAvatarTempPath", uploadData.tempPath);
          }
        }

        // 2. Register
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: this.email,
            password: this.password,
            first_name: this.firstName,
            last_name: this.lastName,
            date_of_birth: this.dateOfBirth,
            nickname: this.nickname,
            about_me: this.aboutMe
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Registration failed");
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
    },

    onAvatarChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.avatarFile = file;
      const reader = new FileReader();
      reader.onload = (ev) => { this.avatarPreview = ev.target.result; };
      reader.readAsDataURL(file);
    },

    removeAvatar() {
      this.avatarFile = null;
      this.avatarPreview = null;
      this.$refs.avatarInput.value = "";
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
              <!-- Row 1: first name + last name -->
              <div class="auth-row">
                <div class="auth-field">
                  <label>First name</label>
                  <input v-model="firstName" type="text" required />
                </div>
                <div class="auth-field">
                  <label>Last name</label>
                  <input v-model="lastName" type="text" required />
                </div>
              </div>

              <!-- Row 2: nickname + date of birth -->
              <div class="auth-row">
                <div class="auth-field">
                  <label>Nickname <span class="auth-optional">(optional)</span></label>
                  <input v-model="nickname" type="text" placeholder="Your nickname" />
                </div>
                <div class="auth-field">
                  <label>Date of birth</label>
                  <input v-model="dateOfBirth" type="date" :max="maxDate" required />                </div>
              </div>

              <!-- Row 3: about me -->
              <div class="auth-field">
                <label>About me <span class="auth-optional">(optional)</span></label>
                <textarea v-model="aboutMe" rows="3" placeholder="Tell others a little about yourself..."></textarea>
              </div>

              <!-- Row 4: avatar upload -->
              <div class="auth-avatar-row">
                <div class="auth-avatar-circle">
                  <img v-if="avatarPreview" :src="avatarPreview" alt="Avatar preview" />
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                </div>
                <span class="auth-avatar-label-text">Avatar upload <span class="auth-optional">(optional)</span></span>
                <label class="auth-avatar-choose-btn">
                  Choose file
                  <input ref="avatarInput" type="file" accept="image/*" @change="onAvatarChange" />
                </label>
                <button v-if="avatarPreview" type="button" class="auth-avatar-remove" @click="removeAvatar" aria-label="Remove avatar">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <!-- Row 5: email -->
              <div class="auth-field">
                <label>Email</label>
                <input v-model="email" type="email" required />
              </div>

              <!-- Row 6: password -->
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