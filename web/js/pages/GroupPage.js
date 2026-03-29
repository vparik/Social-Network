window.GroupPage = {
  name: "GroupPage",

  props: {
    routeQuery: { type: String, default: "" }
  },

  data() {
    return {
      group: null,
      members: [],
      posts: [],
      events: [],
      messages: [],
      joinRequests: [],
      myFollowers: [],
      activeTab: "posts",
      loading: true,
      error: "",

      // forms
      newPost: { title: "", content: "" },
      newEvent: { title: "", content: "", eventAt: "" },
      newMessage: "",
      inviteUserId: null,

      submitting: false,
      chatUnsub: null,
      unsubs: []
    };
  },

  computed: {
    groupId() {
      const params = new URLSearchParams(this.routeQuery);
      return parseInt(params.get("id")) || 0;
    },
    currentUser() {
      return window.Events.state.auth.currentUser;
    },
    isOwner() {
      return this.group && this.currentUser && this.group.ownerId === this.currentUser.id;
    },
    isMember() {
      return this.group && this.group.isMember;
    },
    membersNotInGroup() {
      const memberIds = new Set(this.members.map(m => m.userId));
      return this.myFollowers.filter(f => !memberIds.has(f.id));
    }
  },

  async mounted() {
    if (!this.groupId) { this.error = "Invalid group"; this.loading = false; return; }
    await this.loadGroup();
    this.bindWsEvents();
  },

  beforeUnmount() {
    this.unsubs.forEach(fn => fn());
  },

  methods: {
    // ── Load ──────────────────────────────────────────
    async loadGroup() {
      this.loading = true;
      try {
        const res = await fetch(`/api/groups/${this.groupId}`);
        if (!res.ok) { this.error = "Group not found"; return; }
        this.group = await res.json();
        if (this.group.isMember) {
          await Promise.all([
            this.loadMembers(),
            this.loadPosts(),
            this.loadEvents(),
            this.loadMessages(),
            this.loadMyFollowers()
          ]);
          if (this.isOwner) await this.loadJoinRequests();
        }
      } catch (e) {
        this.error = "Failed to load group";
      } finally {
        this.loading = false;
      }
    },

    async loadMembers() {
      const res = await fetch(`/api/groups/${this.groupId}/members`);
      if (res.ok) this.members = await res.json();
    },

    async loadPosts() {
      const res = await fetch(`/api/groups/${this.groupId}/posts`);
      if (res.ok) this.posts = await res.json();
    },

    async loadEvents() {
      const res = await fetch(`/api/groups/${this.groupId}/events`);
      if (res.ok) this.events = await res.json();
    },

    async loadMessages() {
      const res = await fetch(`/api/groups/${this.groupId}/messages`);
      if (res.ok) this.messages = await res.json();
      this.$nextTick(() => this.scrollChat());
    },

    async loadJoinRequests() {
      const res = await fetch(`/api/groups/${this.groupId}/requests`);
      if (res.ok) this.joinRequests = await res.json();
    },

    async loadMyFollowers() {
      const res = await fetch("/api/followers?id=" + this.currentUser.id);
      if (res.ok) this.myFollowers = await res.json();
    },

    // ── WS ────────────────────────────────────────────
    bindWsEvents() {
      const gid = this.groupId;

      this.unsubs.push(window.Events.on(window.Events.EVENT.GROUP_POST_CREATED, (post) => {
        if (post.groupId !== gid) return;
        if (!this.posts.find(p => p.id === post.id)) this.posts.unshift(post);
      }));

      this.unsubs.push(window.Events.on(window.Events.EVENT.GROUP_POST_DELETED, (data) => {
        if (data.groupId !== gid) return;
        this.posts = this.posts.filter(p => p.id !== data.postId);
      }));

      this.unsubs.push(window.Events.on(window.Events.EVENT.GROUP_COMMENT_CREATED, (comment) => {
        if (comment.groupId !== gid) return;
        const post = this.posts.find(p => p.id === comment.postId);
        if (post) {
          if (!post._comments) post._comments = [];
          if (!post._comments.find(c => c.id === comment.id)) post._comments.push(comment);
        }
      }));

      this.unsubs.push(window.Events.on(window.Events.EVENT.GROUP_COMMENT_DELETED, (data) => {
        if (data.groupId !== gid) return;
        const post = this.posts.find(p => p.id === data.postId);
        if (post && post._comments) post._comments = post._comments.filter(c => c.id !== data.commentId);
      }));

      this.unsubs.push(window.Events.on(window.Events.EVENT.GROUP_EVENT_CREATED, (event) => {
        if (event.groupId !== gid) return;
        if (!this.events.find(e => e.id === event.id)) this.events.push(event);
      }));

      this.unsubs.push(window.Events.on(window.Events.EVENT.GROUP_EVENT_VOTE_UPDATED, (event) => {
        if (event.groupId !== gid) return;
        const idx = this.events.findIndex(e => e.id === event.id);
        if (idx !== -1) this.events[idx] = event;
      }));

      this.unsubs.push(window.Events.on(window.Events.EVENT.GROUP_MESSAGE, (msg) => {
        if (msg.groupId !== gid) return;
        if (!this.messages.find(m => m.id === msg.id)) {
          this.messages.push(msg);
          this.$nextTick(() => this.scrollChat());
        }
      }));

      this.unsubs.push(window.Events.on(window.Events.EVENT.GROUP_MEMBER_CHANGED, (data) => {
        if (data.groupId !== gid) return;
        this.loadMembers();
        if (this.isOwner) this.loadJoinRequests();
      }));
    },

    // ── Posts ──────────────────────────────────────────
    async createPost() {
      if (!this.newPost.content.trim()) return;
      this.submitting = true;
      try {
        const csrf = this.csrf();
        const res = await fetch(`/api/groups/${this.groupId}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify(this.newPost)
        });
        if (res.ok) {
          this.newPost = { title: "", content: "" };
        }
      } finally {
        this.submitting = false;
      }
    },

    async deletePost(post) {
      const ok = await window.AppConfirm.open({ title: "Delete post?", message: "This cannot be undone.", danger: true, confirmText: "Delete" });
      if (!ok) return;
      const csrf = this.csrf();
      await fetch(`/api/groups/${this.groupId}/posts/${post.id}`, {
        method: "DELETE", headers: { "X-CSRF-Token": csrf }
      });
    },

    canDeletePost(post) {
      return this.currentUser && (post.userId === this.currentUser.id || this.isOwner);
    },

    canDeleteComment(comment) {
      return this.currentUser && (comment.userId === this.currentUser.id || this.isOwner);
    },

    // ── Events ─────────────────────────────────────────
    async createEvent() {
      if (!this.newEvent.title.trim() || !this.newEvent.eventAt) return;
      this.submitting = true;
      try {
        const csrf = this.csrf();
        const eventAt = Math.floor(new Date(this.newEvent.eventAt).getTime() / 1000);
        const res = await fetch(`/api/groups/${this.groupId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify({ title: this.newEvent.title, content: this.newEvent.content, eventAt })
        });
        if (res.ok) this.newEvent = { title: "", content: "", eventAt: "" };
      } finally {
        this.submitting = false;
      }
    },

    async vote(event, option) {
      const csrf = this.csrf();
      const res = await fetch(`/api/groups/${this.groupId}/events/${event.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ option })
      });
      if (res.ok) {
        const updated = await res.json();
        const idx = this.events.findIndex(e => e.id === event.id);
        if (idx !== -1) this.events[idx] = updated;
      }
    },

    formatEventDate(ts) {
      return new Date(ts * 1000).toLocaleString();
    },

    voteClass(event, option) {
      if (option === "GOING" && event.myVote === "GOING") return "group-event__vote-btn--active-going";
      if (option === "NOT-GOING" && event.myVote === "NOT-GOING") return "group-event__vote-btn--active-not-going";
      return "";
    },

    // ── Members & Invites ──────────────────────────────
    async inviteUser() {
      if (!this.inviteUserId) return;
      const csrf = this.csrf();
      const res = await fetch(`/api/groups/${this.groupId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ userId: this.inviteUserId })
      });
      const data = await res.json();
      if (res.ok) {
        this.inviteUserId = null;
        alert("Invitation sent!");
      } else {
        alert(data.error || "Could not invite user");
      }
    },

    async acceptRequest(req) {
      const csrf = this.csrf();
      await fetch(`/api/groups/${this.groupId}/requests/${req.userId}/accept`, {
        method: "POST", headers: { "X-CSRF-Token": csrf }
      });
      this.joinRequests = this.joinRequests.filter(r => r.id !== req.id);
      await this.loadMembers();
    },

    async declineRequest(req) {
      const csrf = this.csrf();
      await fetch(`/api/groups/${this.groupId}/requests/${req.userId}`, {
        method: "DELETE", headers: { "X-CSRF-Token": csrf }
      });
      this.joinRequests = this.joinRequests.filter(r => r.id !== req.id);
    },

    async leaveGroup() {
      const ok = await window.AppConfirm.open({ title: "Leave group?", message: "You will need to request to join again.", danger: true, confirmText: "Leave" });
      if (!ok) return;
      const csrf = this.csrf();
      const res = await fetch(`/api/groups/${this.groupId}/members`, {
        method: "DELETE", headers: { "X-CSRF-Token": csrf }
      });
      if (res.ok) window.Router.push("/groups");
    },

    memberName(m) {
      return m.nickname ? "@" + m.nickname : `${m.firstName} ${m.lastName}`;
    },

    memberInitial(m) {
      return (m.firstName || "?")[0].toUpperCase();
    },

    // ── Chat ──────────────────────────────────────────
    sendMessage() {
      const content = this.newMessage.trim();
      if (!content) return;
      window.WS.send("send_group_message", { groupId: this.groupId, content });
      this.newMessage = "";
    },

    handleChatKeydown(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    },

    scrollChat() {
      const el = this.$refs.chatMessages;
      if (el) el.scrollTop = el.scrollHeight;
    },

    isMine(msg) {
      return this.currentUser && msg.userId === this.currentUser.id;
    },

    msgAuthor(msg) {
      return msg.nickname ? "@" + msg.nickname : `${msg.firstName} ${msg.lastName}`;
    },

    // ── Helpers ────────────────────────────────────────
    goToGroups() {
      window.Router.push("/groups");
    },

    csrf() {
      return document.cookie.match(/csrf_token=([^;]+)/)?.[1] || "";
    },

    formatTime(ts) {
      if (!ts) return "";
      return new Date(ts * 1000).toLocaleDateString();
    }
  },

  template: `
    <div class="group-page">

      <!-- Loading / Error -->
      <div v-if="loading" class="group-empty">Loading…</div>
      <div v-else-if="error" class="group-empty" style="color:var(--danger,#e53935)">{{ error }}</div>

      <template v-else-if="group">

        <!-- Header -->
        <div class="group-page__header">
          <h1 class="group-page__name">{{ group.title }}</h1>
          <p v-if="group.description" class="group-page__desc">{{ group.description }}</p>
          <div class="group-page__meta">
            <span>{{ group.memberCount }} member{{ group.memberCount !== 1 ? "s" : "" }}</span>
          </div>
          <div class="group-page__actions">
            <button v-if="isMember && !isOwner" class="btn btn-danger" @click="leaveGroup">Leave Group</button>
            <button v-if="!isMember" class="btn btn-primary" @click="$router ? null : null" disabled>
              Not a member
            </button>
          </div>
        </div>

        <!-- Not a member message -->
        <div v-if="!isMember" class="group-empty">
          You are not a member of this group. Request to join from the
          <a href="#" @click.prevent="goToGroups" style="color:var(--accent,#2374e1)">groups list</a>.
        </div>

        <template v-else>
          <!-- Tabs -->
          <div class="group-tabs">
            <button
              v-for="tab in ['posts','events','members','chat']"
              :key="tab"
              class="group-tab"
              :class="{ 'group-tab--active': activeTab === tab }"
              @click="activeTab = tab; if(tab==='chat') $nextTick(scrollChat)"
            >
              {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
            </button>
          </div>

          <!-- POSTS TAB -->
          <div v-if="activeTab === 'posts'">
            <!-- Create post form -->
            <div class="group-form">
              <p class="group-form__title">New Post</p>
              <input v-model="newPost.title" class="input" placeholder="Title (optional)" />
              <textarea v-model="newPost.content" class="input" placeholder="What's on your mind?" rows="3" style="resize:vertical"></textarea>
              <button class="btn btn-primary" :disabled="submitting || !newPost.content.trim()" @click="createPost">
                {{ submitting ? "Posting…" : "Post" }}
              </button>
            </div>

            <div v-if="posts.length === 0" class="feed-empty">No posts yet. Be the first!</div>

            <GroupPostCard
              v-for="post in posts"
              :key="post.id"
              :post="post"
              :group-id="groupId"
              :can-delete="canDeletePost(post)"
              @delete="deletePost"
            />
          </div>

          <!-- EVENTS TAB -->
          <div v-if="activeTab === 'events'">
            <!-- Create event form -->
            <div class="group-form">
              <p class="group-form__title">New Event</p>
              <input v-model="newEvent.title" class="input" placeholder="Event title *" />
              <textarea v-model="newEvent.content" class="input" placeholder="Description (optional)" rows="2" style="resize:vertical"></textarea>
              <input v-model="newEvent.eventAt" class="input" type="datetime-local" />
              <button class="btn btn-primary" :disabled="submitting || !newEvent.title.trim() || !newEvent.eventAt" @click="createEvent">
                {{ submitting ? "Creating…" : "Create Event" }}
              </button>
            </div>

            <div v-if="events.length === 0" class="group-empty">No events yet.</div>

            <div v-for="event in events" :key="event.id" class="group-event">
              <div class="group-event__title">{{ event.title }}</div>
              <div v-if="event.content" class="group-event__desc">{{ event.content }}</div>
              <div class="group-event__time">📅 {{ formatEventDate(event.eventAt) }}</div>
              <div class="group-event__votes">
                <button
                  class="group-event__vote-btn"
                  :class="voteClass(event, 'GOING')"
                  @click="vote(event, 'GOING')"
                >
                  ✅ Going ({{ event.goingCount }})
                </button>
                <button
                  class="group-event__vote-btn"
                  :class="voteClass(event, 'NOT-GOING')"
                  @click="vote(event, 'NOT-GOING')"
                >
                  ❌ Not Going ({{ event.notGoingCount }})
                </button>
              </div>
            </div>
          </div>

          <!-- MEMBERS TAB -->
          <div v-if="activeTab === 'members'">
            <!-- Member list -->
            <div v-for="member in members" :key="member.userId" class="group-member">
              <div class="group-member__avatar">
                <img v-if="member.avatarPath" :src="member.avatarPath" :alt="member.firstName" />
                <span v-else>{{ memberInitial(member) }}</span>
              </div>
              <span class="group-member__name">{{ memberName(member) }}</span>
              <span v-if="group.ownerId === member.userId" class="group-member__badge">Owner</span>
            </div>

            <!-- Invite section (all members can invite) -->
            <div class="group-invite-section">
              <p class="group-invite-section__title">Invite a follower</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <select v-model="inviteUserId" class="input" style="flex:1;min-width:180px">
                  <option :value="null" disabled>Select a follower…</option>
                  <option v-for="user in membersNotInGroup" :key="user.id" :value="user.id">
                    {{ user.nickname ? '@' + user.nickname : user.firstName + ' ' + user.lastName }}
                  </option>
                </select>
                <button class="btn btn-primary" :disabled="!inviteUserId" @click="inviteUser">Invite</button>
              </div>
              <div v-if="membersNotInGroup.length === 0" style="color:var(--text-secondary,#b0b3b8);font-size:0.82rem;margin-top:8px">
                All your followers are already members.
              </div>
            </div>

            <!-- Join requests (owner only) -->
            <div v-if="isOwner && joinRequests.length > 0" class="group-requests-section">
              <p class="group-requests-section__title">Join Requests ({{ joinRequests.length }})</p>
              <div v-for="req in joinRequests" :key="req.id" class="group-request-item">
                <span>{{ req.nickname ? '@' + req.nickname : req.firstName + ' ' + req.lastName }}</span>
                <div class="group-request-item__actions">
                  <button class="btn btn-primary" style="font-size:0.8rem;padding:4px 10px" @click="acceptRequest(req)">Accept</button>
                  <button class="btn btn-danger" style="font-size:0.8rem;padding:4px 10px" @click="declineRequest(req)">Decline</button>
                </div>
              </div>
            </div>
            <div v-else-if="isOwner" style="margin-top:16px;color:var(--text-secondary,#b0b3b8);font-size:0.85rem">
              No pending join requests.
            </div>
          </div>

          <!-- CHAT TAB -->
          <div v-if="activeTab === 'chat'" class="group-chat">
            <div class="group-chat__messages" ref="chatMessages">
              <div v-if="messages.length === 0" class="group-empty">No messages yet. Say hello!</div>
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="group-chat__msg"
                :class="isMine(msg) ? 'group-chat__msg--mine' : 'group-chat__msg--theirs'"
              >
                <span v-if="!isMine(msg)" class="group-chat__msg-author">{{ msgAuthor(msg) }}</span>
                <div class="group-chat__msg-bubble">{{ msg.content }}</div>
              </div>
            </div>
            <div class="group-chat__input">
              <input
                v-model="newMessage"
                class="input"
                placeholder="Message…"
                @keydown="handleChatKeydown"
              />
              <button class="btn btn-primary" @click="sendMessage">Send</button>
            </div>
          </div>

        </template>
      </template>
    </div>
  `
};
