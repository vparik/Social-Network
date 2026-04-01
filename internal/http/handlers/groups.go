package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/http/ws"
	"strconv"

	"github.com/Des1red/goauthlib/goauth"
)

// POST /api/groups
func CreateGroup(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	var body struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_body"}`))
		return
	}

	group, err := store.CreateGroup(payload.UserID, body.Title, body.Description)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(group)
}

// GET /api/groups
func GetGroups(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groups, err := store.GetAllGroups(payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(groups)
}

// GET /api/groups/{id}
func GetGroup(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	group, err := store.GetGroupByID(groupID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":"group_not_found"}`))
		return
	}

	json.NewEncoder(w).Encode(group)
}

// GET /api/groups/{id}/members
func GetGroupMembers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	isMember, err := store.IsGroupMember(groupID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}
	if !isMember {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"forbidden"}`))
		return
	}

	members, err := store.GetGroupMembers(groupID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(members)
}

// POST /api/groups/{id}/join
func JoinGroup(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	if err := store.CreateGroupJoinRequest(groupID, payload.UserID); err != nil {
		switch err.Error() {
		case "already_member":
			w.WriteHeader(http.StatusConflict)
			w.Write([]byte(`{"error":"already_member"}`))
		case "already_requested":
			w.WriteHeader(http.StatusConflict)
			w.Write([]byte(`{"error":"already_requested"}`))
		default:
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
		}
		return
	}

	// Notify group owner
	group, err := store.GetGroupByID(groupID, payload.UserID)
	if err == nil {
		entityID := groupID
		if err := store.CreateNotification(group.OwnerID, payload.UserID, "group_join_request", &entityID); err == nil {
			if n, err := store.GetLatestNotification(group.OwnerID); err == nil {
				if unread, err := store.CountUnreadNotifications(group.OwnerID); err == nil {
					ws.NotifyNotificationCreated(group.OwnerID, n, unread)
				}
			}
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}

// DELETE /api/groups/{id}/members
func LeaveGroup(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	if err := store.RemoveGroupMember(groupID, payload.UserID, payload.UserID); err != nil {
		switch err.Error() {
		case "owner_cannot_leave":
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(`{"error":"owner_cannot_leave"}`))
		default:
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
		}
		return
	}

	ws.NotifyGroupMemberChanged(groupID, payload.UserID, "left")

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}

// DELETE /api/groups/{id}/members/{userID}
func RemoveMember(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	targetID, err := strconv.Atoi(r.PathValue("userID"))
	if err != nil || targetID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_user_id"}`))
		return
	}

	if err := store.RemoveGroupMember(groupID, targetID, payload.UserID); err != nil {
		switch err.Error() {
		case "forbidden":
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"error":"forbidden"}`))
		default:
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
		}
		return
	}

	ws.NotifyGroupMemberChanged(groupID, targetID, "removed")

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}

// POST /api/groups/{id}/invite
func InviteToGroup(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	var body struct {
		UserID int `json:"userId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.UserID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_body"}`))
		return
	}

	if err := store.CreateGroupInvite(groupID, payload.UserID, body.UserID); err != nil {
		switch err.Error() {
		case "forbidden":
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"error":"forbidden"}`))
		case "already_member":
			w.WriteHeader(http.StatusConflict)
			w.Write([]byte(`{"error":"already_member"}`))
		case "already_invited":
			w.WriteHeader(http.StatusConflict)
			w.Write([]byte(`{"error":"already_invited"}`))
		default:
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
		}
		return
	}

	// Notify invited user
	entityID := groupID
	if err := store.CreateNotification(body.UserID, payload.UserID, "group_invite", &entityID); err == nil {
		if n, err := store.GetLatestNotification(body.UserID); err == nil {
			if unread, err := store.CountUnreadNotifications(body.UserID); err == nil {
				ws.NotifyNotificationCreated(body.UserID, n, unread)
			}
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}

// GET /api/groups/{id}/requests
func GetGroupJoinRequests(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	isOwner, err := store.IsGroupOwner(groupID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}
	if !isOwner {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"forbidden"}`))
		return
	}

	requests, err := store.GetGroupJoinRequests(groupID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(requests)
}

// POST /api/groups/{id}/requests/{userID}/accept
func AcceptGroupJoinRequest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	requesterID, err := strconv.Atoi(r.PathValue("userID"))
	if err != nil || requesterID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_user_id"}`))
		return
	}

	if err := store.AcceptGroupJoinRequest(groupID, requesterID, payload.UserID); err != nil {
		switch err.Error() {
		case "forbidden":
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"error":"forbidden"}`))
		case "request_not_found":
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error":"request_not_found"}`))
		default:
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
		}
		return
	}

	// Remove the join_request notification and notify requester they were accepted
	_ = store.DeleteGroupNotification(payload.UserID, requesterID, "group_join_request", groupID)

	entityID := groupID
	if err := store.CreateNotification(requesterID, payload.UserID, "group_join_accepted", &entityID); err == nil {
		if n, err := store.GetLatestNotification(requesterID); err == nil {
			if unread, err := store.CountUnreadNotifications(requesterID); err == nil {
				ws.NotifyNotificationCreated(requesterID, n, unread)
			}
		}
	}

	ws.NotifyGroupMemberChanged(groupID, requesterID, "joined")

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}

// DELETE /api/groups/{id}/requests/{userID}
func DeclineGroupJoinRequest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	requesterID, err := strconv.Atoi(r.PathValue("userID"))
	if err != nil || requesterID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_user_id"}`))
		return
	}

	if err := store.DeclineGroupJoinRequest(groupID, requesterID, payload.UserID); err != nil {
		switch err.Error() {
		case "forbidden":
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"error":"forbidden"}`))
		default:
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
		}
		return
	}

	_ = store.DeleteGroupNotification(payload.UserID, requesterID, "group_join_request", groupID)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}

// GET /api/groups/invites
func GetMyGroupInvites(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	invites, err := store.GetGroupInvitesForUser(payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(invites)
}

// POST /api/groups/{id}/invites/accept
func AcceptGroupInvite(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	if err := store.AcceptGroupInvite(groupID, payload.UserID); err != nil {
		switch err.Error() {
		case "invite_not_found":
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error":"invite_not_found"}`))
		default:
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
		}
		return
	}

	_ = store.DeleteGroupNotification(payload.UserID, 0, "group_invite", groupID)

	ws.NotifyGroupMemberChanged(groupID, payload.UserID, "joined")

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}

// DELETE /api/groups/{id}/invites
func DeclineGroupInvite(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	if err := store.DeclineGroupInvite(groupID, payload.UserID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	_ = store.DeleteGroupNotification(payload.UserID, 0, "group_invite", groupID)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}
