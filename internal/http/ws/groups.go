package ws

import (
	"log"
	"socialnet/internal/database/store"
	"socialnet/internal/models"
)

func groupMemberIDs(groupID int) []int {
	ids, err := store.GetGroupMemberIDs(groupID)
	if err != nil {
		log.Println("GetGroupMemberIDs error:", err)
		return nil
	}
	return ids
}

func NotifyGroupPostCreated(post *models.GroupPost) {
	if post == nil {
		return
	}
	Manager.SendToMany(groupMemberIDs(post.GroupID), models.ChatEvent{
		Type: "group_post_created",
		Data: post,
	})
}

func NotifyGroupPostDeleted(groupID, postID int) {
	Manager.SendToMany(groupMemberIDs(groupID), models.ChatEvent{
		Type: "group_post_deleted",
		Data: map[string]int{"groupId": groupID, "postId": postID},
	})
}

func NotifyGroupCommentCreated(groupID int, comment *models.GroupComment) {
	if comment == nil {
		return
	}
	Manager.SendToMany(groupMemberIDs(groupID), models.ChatEvent{
		Type: "group_comment_created",
		Data: comment,
	})
}

func NotifyGroupCommentDeleted(groupID, postID, commentID int) {
	Manager.SendToMany(groupMemberIDs(groupID), models.ChatEvent{
		Type: "group_comment_deleted",
		Data: map[string]int{"groupId": groupID, "postId": postID, "commentId": commentID},
	})
}

func NotifyGroupEventCreated(event *models.Event) {
	if event == nil {
		return
	}
	Manager.SendToMany(groupMemberIDs(event.GroupID), models.ChatEvent{
		Type: "group_event_created",
		Data: event,
	})
}

func NotifyGroupEventVoteUpdated(event *models.Event) {
	if event == nil {
		return
	}
	Manager.SendToMany(groupMemberIDs(event.GroupID), models.ChatEvent{
		Type: "group_event_vote_updated",
		Data: event,
	})
}

func NotifyGroupMemberChanged(groupID, userID int, action string) {
	event := models.ChatEvent{
		Type: "group_member_changed",
		Data: map[string]any{"groupId": groupID, "userId": userID, "action": action},
	}
	Manager.SendToMany(groupMemberIDs(groupID), event)
	// Removed users are no longer in the member list, so notify them separately
	if action == "removed" {
		Manager.SendToMany([]int{userID}, event)
	}
}
