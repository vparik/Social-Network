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
      activeTab: "feed",
      loading: true,
      error: "",

      // forms
      newMessage: "",
      inviteUserId: null,
      dropdownOpen: false,
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
    },
    selectedInviteUser() {
      return this.membersNotInGroup.find(u => u.id === this.inviteUserId) || null;
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
        if (data.action === "removed" && this.currentUser && data.userId === this.currentUser.id) {
          window.Router.push("/groups");
          return;
        }
        this.loadMembers();
        if (this.isOwner) this.loadJoinRequests();
      }));
    },

    // ── Posts ──────────────────────────────────────────
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
    goToProfile(userId) {
      window.Router.push("/profile?id=" + userId);
    },

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
        this.dropdownOpen = false;
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
      window.Events.emit(window.Events.EVENT.NOTIFICATIONS_UPDATED, {
        removeGroupJoinRequestActorId: req.userId
      });
      await this.loadMembers();
    },
    
    async declineRequest(req) {
      const csrf = this.csrf();
      await fetch(`/api/groups/${this.groupId}/requests/${req.userId}`, {
        method: "DELETE", headers: { "X-CSRF-Token": csrf }
      });
      this.joinRequests = this.joinRequests.filter(r => r.id !== req.id);
      window.Events.emit(window.Events.EVENT.NOTIFICATIONS_UPDATED, {
        removeGroupJoinRequestActorId: req.userId
      });
    },

    async removeMember(member) {
      const name = this.memberName(member);
      const ok = await window.AppConfirm.open({ title: `Remove ${name}?`, message: "They will need to request to join again.", danger: true, confirmText: "Remove" });
      if (!ok) return;
      const res = await fetch(`/api/groups/${this.groupId}/members/${member.userId}`, {
        method: "DELETE", headers: { "X-CSRF-Token": this.csrf() }
      });
      if (res.ok) this.members = this.members.filter(m => m.userId !== member.userId);
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
      return window.extractCsrfToken();
    },

    formatTime(ts) {
      if (!ts) return "";
      return new Date(ts * 1000).toLocaleDateString();
    },

    toggleInviteDropdown() {
      this.dropdownOpen = !this.dropdownOpen;
    },

    selectInviteUser(user) {
      this.inviteUserId = user.id;
      this.dropdownOpen = false;
    },

    inviteLabel(user) {
      return user.nickname ? "@" + user.nickname : `${user.firstName} ${user.lastName}`;
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
              v-for="tab in [
                { key: 'feed',       label: 'Feed' },
                { key: 'live-events',label: 'Live Events' },
                { key: 'new-post',   label: 'New Post' },
                { key: 'new-event',  label: 'New Event' },
                { key: 'members',    label: 'Members' },
                { key: 'chat',       label: 'Chat' }
              ]"
              :key="tab.key"
              class="group-tab"
              :class="{ 'group-tab--active': activeTab === tab.key }"
              @click="activeTab = tab.key; if(tab.key==='chat') $nextTick(scrollChat)"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- FEED TAB – posts list only -->
          <div v-if="activeTab === 'feed'">
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

          <!-- LIVE EVENTS TAB – events list only -->
          <div v-if="activeTab === 'live-events'">
            <div v-if="events.length === 0" class="group-empty">No events yet.</div>
            <div v-for="event in events" :key="event.id" class="group-event">
              <div class="group-event__title">{{ event.title }}</div>
              <div v-if="event.content" class="group-event__desc">{{ event.content }}</div>
              <div class="group-event__time">
                            <span class="material-symbols-outlined group-event__time-icon">calendar_today</span>
                            {{ formatEventDate(event.eventAt) }}
                          </div>
              <div class="group-event__votes">
                <button
                  class="group-event__vote-btn"
                  :class="voteClass(event, 'GOING')"
                  @click="vote(event, 'GOING')"
                >
                  Going ({{ event.goingCount }})
                </button>
                <button
                  class="group-event__vote-btn"
                  :class="voteClass(event, 'NOT-GOING')"
                  @click="vote(event, 'NOT-GOING')"
                >
                  Not Going ({{ event.notGoingCount }})
                </button>
              </div>
            </div>
          </div>

          <!-- NEW POST TAB – create form only -->
          <div v-if="activeTab === 'new-post'">
            <CreatePost :group-id="groupId" :inline="true" />
          </div>

          <!-- NEW EVENT TAB – create form only -->
          <div v-if="activeTab === 'new-event'">
            <CreatePost :group-id="groupId" :inline="true" initial-mode="event" />
          </div>

          <!-- MEMBERS TAB -->
          <div v-if="activeTab === 'members'">
            <!-- Member list -->
            <div v-for="member in members" :key="member.userId" class="group-member" style="cursor:pointer" @click="goToProfile(member.userId)">              <div class="group-member__avatar">
                <img v-if="member.avatarPath" :src="member.avatarPath" :alt="member.firstName" />
                <span v-else>{{ memberInitial(member) }}</span>
              </div>
              <span class="group-member__name">{{ memberName(member) }}</span>
              <span v-if="group.ownerId === member.userId" class="group-member__badge">Owner</span>
              <button
                v-if="isOwner && group.ownerId !== member.userId"
                class="btn btn-danger"
                style="font-size:0.8rem;padding:4px 10px;margin-left:auto"
                @click.stop="removeMember(member)"
              >Remove</button>
            </div>

            <!-- Invite section (all members can invite) -->
            <div class="group-invite-section">
              <p class="group-invite-section__title">Invite a follower</p>

              <div class="group-invite-row">
                <div class="group-select" :class="{ 'group-select--open': dropdownOpen }">
                  <button
                    type="button"
                    class="group-select__trigger"
                    @click="toggleInviteDropdown"
                  >
                    <span class="group-select__text">
                      {{ selectedInviteUser ? inviteLabel(selectedInviteUser) : 'Select a follower…' }}
                    </span>
                    <span class="group-select__caret">⌄</span>
                  </button>

                  <div v-if="dropdownOpen" class="group-select__menu">
                    <button
                      v-for="user in membersNotInGroup"
                      :key="user.id"
                      type="button"
                      class="group-select__option"
                      @click="selectInviteUser(user)"
                    >
                      {{ inviteLabel(user) }}
                    </button>

                    <div v-if="membersNotInGroup.length === 0" class="group-select__empty">
                      {{ myFollowers.length === 0 ? 'You have no followers.' : 'All your followers are already members.' }}
                    </div>
                  </div>
                </div>
                
                <button class="btn btn-primary" :disabled="!inviteUserId" @click="inviteUser">
                  Invite
                </button>
              </div>
            </div>

            <!-- Join requests (owner only) -->
            <div v-if="isOwner" class="group-requests-section">
              <p class="group-requests-section__title">Join Requests ({{ joinRequests.length }})</p>
              <div v-if="joinRequests.length > 0">
                <div v-for="req in joinRequests" :key="req.id" class="group-request-item">
                  <span>{{ req.nickname ? '@' + req.nickname : req.firstName + ' ' + req.lastName }}</span>
                  <div class="group-request-item__actions">
                    <button class="btn btn-primary" style="font-size:0.8rem;padding:4px 10px" @click="acceptRequest(req)">Accept</button>
                    <button class="btn btn-danger" style="font-size:0.8rem;padding:4px 10px" @click="declineRequest(req)">Decline</button>
                  </div>
                </div>
              </div>
              <div v-else style="color:var(--text-secondary,#b0b3b8);font-size:0.85rem">
                No pending join requests.
              </div>
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
