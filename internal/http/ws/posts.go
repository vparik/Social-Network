package ws

import (
	"socialnet/internal/database/store"
	"socialnet/internal/models"
)

// NotifyPostCreated sends a post_created event only to users who are allowed
// to see the new post.
func NotifyPostCreated(post *models.Post) {
	if post == nil {
		return
	}

	seen := make(map[int]bool)
	var allowedUserIDs []int

	addUser := func(userID int) {
		if userID <= 0 {
			return
		}
		if seen[userID] {
			return
		}
		seen[userID] = true
		allowedUserIDs = append(allowedUserIDs, userID)
	}

	switch post.Privacy {
	case "public":
		for _, userID := range Manager.OnlineUserIDs() {
			addUser(userID)
		}

	case "selected":
		// selected = followers only
		addUser(post.UserID)

		followers, err := store.GetFollowers(post.UserID)
		if err != nil {
			return
		}
		for _, user := range followers {
			addUser(user.ID)
		}

	case "private":
		// private = creator + explicitly allowed users
		addUser(post.UserID)

		userIDs, err := store.GetAllowedUserIDsForPost(post.ID)
		if err != nil {
			return
		}
		for _, userID := range userIDs {
			addUser(userID)
		}
	}

	if len(allowedUserIDs) == 0 {
		return
	}

	Manager.SendToMany(allowedUserIDs, models.ChatEvent{
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
