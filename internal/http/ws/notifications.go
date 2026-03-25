package ws

import "socialnet/internal/models"

func NotifyNotificationCreated(userID int, notification *models.Notification, unreadCount int) {
	if notification == nil {
		return
	}

	conn, ok := Manager.Get(userID)
	if !ok || conn == nil {
		return
	}

	_ = conn.WriteJSON(models.ChatEvent{
		Type: "notification_created",
		Data: map[string]any{
			"notification": notification,
			"unreadCount":  unreadCount,
		},
	})
}

func NotifyNotificationsRead(userID int) {
	conn, ok := Manager.Get(userID)
	if !ok || conn == nil {
		return
	}

	_ = conn.WriteJSON(models.ChatEvent{
		Type: "notifications_read",
		Data: map[string]any{
			"unreadCount": 0,
		},
	})
}
