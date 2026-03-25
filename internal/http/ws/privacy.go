package ws

import "socialnet/internal/models"

func NotifyProfilePrivacyChanged(actorUserID int, isPublic bool) {
	userIDs := onlineUserIDsExcept(actorUserID)
	if len(userIDs) == 0 {
		return
	}

	Manager.SendToMany(userIDs, models.ChatEvent{
		Type: "profile_privacy_changed",
		Data: map[string]any{
			"userId":   actorUserID,
			"isPublic": isPublic,
		},
	})
}
