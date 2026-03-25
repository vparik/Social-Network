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

func onlineUserIDsExcept(excludeUserID int) []int {
	ids := Manager.OnlineUserIDs()
	out := make([]int, 0, len(ids))

	for _, id := range ids {
		if id == excludeUserID {
			continue
		}
		out = append(out, id)
	}

	return out
}
