package ws

import "socialnet/internal/models"

func NotifyPostCreated(post *models.Post) {
	if post == nil {
		return
	}

	userIDs := onlineUserIDsExcept(post.UserID)
	if len(userIDs) == 0 {
		return
	}

	Manager.SendToMany(userIDs, models.ChatEvent{
		Type: "post_created",
		Data: post,
	})
}

func NotifyPostDeleted(actorUserID, postID int) {
	userIDs := onlineUserIDsExcept(actorUserID)
	if len(userIDs) == 0 {
		return
	}

	Manager.SendToMany(userIDs, models.ChatEvent{
		Type: "post_deleted",
		Data: map[string]int{
			"postId": postID,
		},
	})
}
