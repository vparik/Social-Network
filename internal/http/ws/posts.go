package ws

import (
	"socialnet/internal/database/store"
	"socialnet/internal/models"
)

// NotifyPostCreated sends a notification about a newly created post to the users who should be able to view it.
func NotifyPostCreated(post *models.Post) {
	if post == nil {
		return
	}

	var allowedUserIDs []int

	switch post.Privacy {
	case "public":
		// All users can see public posts
		allowedUserIDs = Manager.OnlineUserIDs()
	case "selected":
		// Only users who follow the post creator can see "followers only" posts
		followingUserIDs, err := store.GetFollowing(post.UserID)
		if err != nil {
			return
		}
		// Collect user IDs of followers
		for _, user := range followingUserIDs {
			allowedUserIDs = append(allowedUserIDs, user.ID)
		}
	case "private":
		// Only the post creator and their chosen followers can see private posts
		followersUserIDs, err := store.GetFollowers(post.UserID)
		if err != nil {
			return
		}
		// Add the post creator and their followers
		allowedUserIDs = append(allowedUserIDs, post.UserID)
		for _, user := range followersUserIDs {
			allowedUserIDs = append(allowedUserIDs, user.ID)
		}
	}

	// Send the notification to the users that are allowed to see the post
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
