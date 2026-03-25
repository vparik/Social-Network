package ws

import "socialnet/internal/models"

func NotifyCommentCreated(comment *models.Comment) {
	if comment == nil {
		return
	}

	userIDs := onlineUserIDsExcept(comment.UserID)
	if len(userIDs) == 0 {
		return
	}

	Manager.SendToMany(userIDs, models.ChatEvent{
		Type: "comment_created",
		Data: map[string]any{
			"postId":  comment.PostID,
			"comment": comment,
		},
	})
}
