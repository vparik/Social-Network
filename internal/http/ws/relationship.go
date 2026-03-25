package ws

import "socialnet/internal/models"

func NotifyRelationshipChanged(userIDs []int, actorID, targetID int, action string) {
	if len(userIDs) == 0 {
		return
	}

	Manager.SendToMany(userIDs, models.ChatEvent{
		Type: "relationship_changed",
		Data: models.RelationshipChangedPayload{
			ActorID:  actorID,
			TargetID: targetID,
			Action:   action,
			Entity:   "follow",
			Scope:    "relationship",
		},
	})
}
