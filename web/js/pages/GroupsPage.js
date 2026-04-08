window.GroupsPage = {
  name: "GroupsPage",

  data() {
    return {
      groups: [],
      loading: true,
      showCreateForm: false,
      creating: false,
      newGroup: { title: "", description: "" },
      error: ""
    };
  },

  async mounted() {
    await this.loadGroups();
    this._unsubMember = window.Events.on(window.Events.EVENT.GROUP_MEMBER_CHANGED, () => {
      this.loadGroups();
    });
  },

  beforeUnmount() {
    if (this._unsubMember) this._unsubMember();
  },

  methods: {
    async loadGroups() {
      this.loading = true;
      try {
        const res = await fetch("/api/groups");
        if (res.ok) this.groups = await res.json();
      } catch (e) {
        console.error("loadGroups error", e);
      } finally {
        this.loading = false;
      }
    },

    async createGroup() {
      if (!this.newGroup.title.trim()) return;
      this.creating = true;
      this.error = "";
      try {
        const csrf = window.extractCsrfToken();
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify(this.newGroup)
        });
        const data = await res.json();
        if (!res.ok) { this.error = data.error || "Failed to create group"; return; }
        this.groups.unshift(data);
        this.newGroup = { title: "", description: "" };
        this.showCreateForm = false;
        window.Router.push("/group?id=" + data.id);
      } catch (e) {
        this.error = "Failed to create group";
      } finally {
        this.creating = false;
      }
    },

    async joinGroup(group) {
      const csrf = window.extractCsrfToken();
      const res = await fetch(`/api/groups/${group.id}/join`, {
        method: "POST",
        headers: { "X-CSRF-Token": csrf }
      });
      const data = await res.json();
      if (res.ok) {
       group.isPending = true;
      } else {
        alert(data.error || "Could not send join request");
      }
    },

    openGroup(id) {
      window.Router.push("/group?id=" + id);
    },

    memberLabel(group) {
      return group.memberCount === 1 ? "1 member" : `${group.memberCount} members`;
    }
  },

  template: `
    <div class="groups-page">
      <div class="groups-page__header">
        <h1 class="groups-page__title">Groups</h1>
        <button class="btn btn-primary" @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? "Cancel" : "+ Create Group" }}
        </button>
      </div>

      <div v-if="showCreateForm" class="group-create-form">
        <p class="group-create-form__title">New Group</p>
        <input
          v-model="newGroup.title"
          class="input"
          placeholder="Group name *"
          maxlength="100"
        />
        <textarea
          v-model="newGroup.description"
          class="input"
          placeholder="Description (optional)"
          rows="2"
          style="resize:vertical"
        ></textarea>
        <div v-if="error" style="color:var(--danger,#e53935);font-size:0.85rem">{{ error }}</div>
        <button class="btn btn-primary" :disabled="creating || !newGroup.title.trim()" @click="createGroup">
          {{ creating ? "Creating…" : "Create" }}
        </button>
      </div>

      <div v-if="loading" class="group-empty">Loading…</div>

      <div v-else-if="groups.length === 0" class="group-empty">
        No groups yet. Create one!
      </div>

      <div v-else class="groups-grid">
        <div v-for="group in groups" :key="group.id" class="group-card">
          <h3 class="group-card__title">{{ group.title }}</h3>
          <p class="group-card__desc">{{ group.description || "No description" }}</p>
          <span class="group-card__meta">{{ memberLabel(group) }}</span>
          <div class="group-card__actions">
            <button
              v-if="group.isMember"
              class="btn btn-primary"
              @click="openGroup(group.id)"
            >View</button>
            <button
  v-else-if="group.isPending"
  class="btn btn-secondary"
  disabled
>Requested</button>
            <button
              v-else
              class="btn btn-secondary"
              @click="joinGroup(group)"
            >Request to Join</button>
          </div>
        </div>
      </div>
    </div>
  `
};
