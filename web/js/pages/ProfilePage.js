window.ProfilePage = {
  name: "ProfilePage",

  data() {
    return {
      profile: null,
      loading: true,
      error: null,
    };
  },

  async mounted() {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      const url = id ? `/api/profile?id=${id}` : "/api/profile";

      const res = await fetch(url, { method: "GET" });

      if (res.status === 401) {
        Router.replace("/login");
        return;
      }
      if (!res.ok) {
        this.error = "Failed to load profile.";
        this.loading = false;
        return;
      }

      this.profile = await res.json();
      this.loading = false;
    } catch {
      this.error = "Network error.";
      this.loading = false;
    }
  },

  template: `
    <div>
      <div v-if="loading" class="container">Loading...</div>
      <div v-else-if="error" class="container error">{{ error }}</div>
      <div v-else class="container">
        <div class="profile-header">
          <img
            v-if="profile.avatar_path"
            :src="profile.avatar_path"
            class="profile-avatar"
            alt="Avatar"
          />
          <div v-else class="profile-avatar-placeholder">
            {{ profile.first_name[0] }}{{ profile.last_name[0] }}
          </div>
          <div class="profile-info">
            <h1>{{ profile.first_name }} {{ profile.last_name }}</h1>
            <p v-if="profile.nickname" class="profile-nickname">@{{ profile.nickname }}</p>
            <p v-if="profile.about_me" class="profile-about">{{ profile.about_me }}</p>
          </div>
        </div>
      </div>
    </div>
  `
};