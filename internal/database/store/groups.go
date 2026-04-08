package store

import (
	"database/sql"
	"errors"
	"socialnet/internal/database"
	"socialnet/internal/models"
)

func CreateGroup(ownerID int, title, description string) (*models.Group, error) {
	tx, err := database.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	result, err := tx.Exec(
		`INSERT INTO groups (owner_id, title, description) VALUES (?, ?, ?)`,
		ownerID, title, description,
	)
	if err != nil {
		return nil, err
	}

	groupID64, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}
	groupID := int(groupID64)

	// Owner is automatically a member
	if _, err := tx.Exec(
		`INSERT INTO group_members (group_id, user_id) VALUES (?, ?)`,
		groupID, ownerID,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return GetGroupByID(groupID, ownerID)
}

func GetGroupByID(groupID, viewerID int) (*models.Group, error) {
	g := &models.Group{}
	err := database.DB.QueryRow(
		`SELECT
        g.id, g.owner_id, g.title, g.description, g.created_at,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
        EXISTS(SELECT 1 FROM group_members WHERE group_id = g.id AND user_id = ?) AS is_member,
        (g.owner_id = ?) AS is_owner,
        EXISTS(SELECT 1 FROM group_requests WHERE group_id = g.id AND user_id = ? AND type = 'join_request') AS is_pending
     FROM groups g
     WHERE g.id = ?`,
		viewerID, viewerID, viewerID, groupID,
	).Scan(
		&g.ID, &g.OwnerID, &g.Title, &g.Description, &g.CreatedAt,
		&g.MemberCount, &g.IsMember, &g.IsOwner, &g.IsPending,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("group_not_found")
	}
	return g, err
}

func GetAllGroups(viewerID int) ([]*models.Group, error) {
	rows, err := database.DB.Query(
		`SELECT
        g.id, g.owner_id, g.title, g.description, g.created_at,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
        EXISTS(SELECT 1 FROM group_members WHERE group_id = g.id AND user_id = ?) AS is_member,
        (g.owner_id = ?) AS is_owner,
        EXISTS(SELECT 1 FROM group_requests WHERE group_id = g.id AND user_id = ? AND type = 'join_request') AS is_pending
     FROM groups g
     ORDER BY g.created_at DESC`,
		viewerID, viewerID, viewerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []*models.Group
	for rows.Next() {
		g := &models.Group{}
		if err := rows.Scan(
			&g.ID, &g.OwnerID, &g.Title, &g.Description, &g.CreatedAt,
			&g.MemberCount, &g.IsMember, &g.IsOwner, &g.IsPending,
		); err != nil {
			return nil, err
		}
		groups = append(groups, g)
	}
	if groups == nil {
		groups = []*models.Group{}
	}
	return groups, rows.Err()
}

func GetUserGroups(userID int) ([]*models.Group, error) {
	rows, err := database.DB.Query(
		`SELECT
			g.id, g.owner_id, g.title, g.description, g.created_at,
			(SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
			1 AS is_member,
			(g.owner_id = ?) AS is_owner
		 FROM groups g
		 JOIN group_members gm ON gm.group_id = g.id
		 WHERE gm.user_id = ?
		 ORDER BY g.created_at DESC`,
		userID, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []*models.Group
	for rows.Next() {
		g := &models.Group{}
		if err := rows.Scan(
			&g.ID, &g.OwnerID, &g.Title, &g.Description, &g.CreatedAt,
			&g.MemberCount, &g.IsMember, &g.IsOwner,
		); err != nil {
			return nil, err
		}
		groups = append(groups, g)
	}
	if groups == nil {
		groups = []*models.Group{}
	}
	return groups, rows.Err()
}

func IsGroupMember(groupID, userID int) (bool, error) {
	var exists int
	err := database.DB.QueryRow(
		`SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
		groupID, userID,
	).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func IsGroupOwner(groupID, userID int) (bool, error) {
	var exists int
	err := database.DB.QueryRow(
		`SELECT 1 FROM groups WHERE id = ? AND owner_id = ? LIMIT 1`,
		groupID, userID,
	).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func GetGroupMembers(groupID int) ([]*models.GroupMember, error) {
	rows, err := database.DB.Query(
		`SELECT gm.group_id, gm.user_id, u.first_name, u.last_name,
		        COALESCE(u.nickname, ''), COALESCE(u.avatar_path, ''), gm.joined_at
		 FROM group_members gm
		 JOIN users u ON u.id = gm.user_id
		 WHERE gm.group_id = ?
		 ORDER BY gm.joined_at ASC`,
		groupID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*models.GroupMember
	for rows.Next() {
		m := &models.GroupMember{}
		if err := rows.Scan(
			&m.GroupID, &m.UserID, &m.FirstName, &m.LastName,
			&m.Nickname, &m.AvatarPath, &m.JoinedAt,
		); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	if members == nil {
		members = []*models.GroupMember{}
	}
	return members, rows.Err()
}

func GetGroupMemberIDs(groupID int) ([]int, error) {
	rows, err := database.DB.Query(
		`SELECT user_id FROM group_members WHERE group_id = ?`,
		groupID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func RemoveGroupMember(groupID, userID, actorID int) error {
	isOwner, err := IsGroupOwner(groupID, actorID)
	if err != nil {
		return err
	}
	// Only the owner can remove others; anyone can remove themselves
	if actorID != userID && !isOwner {
		return errors.New("forbidden")
	}
	// Owner cannot leave their own group
	if actorID == userID && isOwner {
		return errors.New("owner_cannot_leave")
	}
	_, err = database.DB.Exec(
		`DELETE FROM group_members WHERE group_id = ? AND user_id = ?`,
		groupID, userID,
	)
	return err
}

// --- Requests & Invites ---

func HasPendingGroupRequest(groupID, userID int, reqType string) (bool, error) {
	var exists int
	err := database.DB.QueryRow(
		`SELECT 1 FROM group_requests WHERE group_id = ? AND user_id = ? AND type = ? LIMIT 1`,
		groupID, userID, reqType,
	).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func CreateGroupJoinRequest(groupID, userID int) error {
	isMember, err := IsGroupMember(groupID, userID)
	if err != nil {
		return err
	}
	if isMember {
		return errors.New("already_member")
	}

	hasPending, err := HasPendingGroupRequest(groupID, userID, "join_request")
	if err != nil {
		return err
	}
	if hasPending {
		return errors.New("already_requested")
	}

	_, err = database.DB.Exec(
		`INSERT INTO group_requests (group_id, user_id, type) VALUES (?, ?, 'join_request')`,
		groupID, userID,
	)
	return err
}

func CreateGroupInvite(groupID, inviterID, targetUserID int) error {
	isMember, err := IsGroupMember(groupID, inviterID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("forbidden")
	}

	isAlreadyMember, err := IsGroupMember(groupID, targetUserID)
	if err != nil {
		return err
	}
	if isAlreadyMember {
		return errors.New("already_member")
	}

	hasPending, err := HasPendingGroupRequest(groupID, targetUserID, "invite")
	if err != nil {
		return err
	}
	if hasPending {
		return errors.New("already_invited")
	}

	_, err = database.DB.Exec(
		`INSERT INTO group_requests (group_id, user_id, type) VALUES (?, ?, 'invite')`,
		groupID, targetUserID,
	)
	return err
}

func GetGroupJoinRequests(groupID int) ([]*models.GroupRequest, error) {
	rows, err := database.DB.Query(
		`SELECT gr.id, gr.group_id, gr.user_id, gr.type, gr.created_at,
		        u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar_path, '')
		 FROM group_requests gr
		 JOIN users u ON u.id = gr.user_id
		 WHERE gr.group_id = ? AND gr.type = 'join_request'
		 ORDER BY gr.created_at DESC`,
		groupID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanGroupRequests(rows)
}

func GetGroupInvitesForUser(userID int) ([]*models.GroupRequest, error) {
	rows, err := database.DB.Query(
		`SELECT gr.id, gr.group_id, gr.user_id, gr.type, gr.created_at,
		        u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar_path, '')
		 FROM group_requests gr
		 JOIN users u ON u.id = gr.user_id
		 WHERE gr.user_id = ? AND gr.type = 'invite'
		 ORDER BY gr.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanGroupRequests(rows)
}

func AcceptGroupJoinRequest(groupID, requesterID, actorID int) error {
	isOwner, err := IsGroupOwner(groupID, actorID)
	if err != nil {
		return err
	}
	if !isOwner {
		return errors.New("forbidden")
	}

	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var exists int
	if err := tx.QueryRow(
		`SELECT 1 FROM group_requests WHERE group_id = ? AND user_id = ? AND type = 'join_request' LIMIT 1`,
		groupID, requesterID,
	).Scan(&exists); errors.Is(err, sql.ErrNoRows) {
		return errors.New("request_not_found")
	} else if err != nil {
		return err
	}

	if _, err := tx.Exec(
		`DELETE FROM group_requests WHERE group_id = ? AND user_id = ? AND type = 'join_request'`,
		groupID, requesterID,
	); err != nil {
		return err
	}

	if _, err := tx.Exec(
		`INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)`,
		groupID, requesterID,
	); err != nil {
		return err
	}

	return tx.Commit()
}

func DeclineGroupJoinRequest(groupID, requesterID, actorID int) error {
	isOwner, err := IsGroupOwner(groupID, actorID)
	if err != nil {
		return err
	}
	if !isOwner {
		return errors.New("forbidden")
	}

	_, err = database.DB.Exec(
		`DELETE FROM group_requests WHERE group_id = ? AND user_id = ? AND type = 'join_request'`,
		groupID, requesterID,
	)
	return err
}

func AcceptGroupInvite(groupID, userID int) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var exists int
	if err := tx.QueryRow(
		`SELECT 1 FROM group_requests WHERE group_id = ? AND user_id = ? AND type = 'invite' LIMIT 1`,
		groupID, userID,
	).Scan(&exists); errors.Is(err, sql.ErrNoRows) {
		return errors.New("invite_not_found")
	} else if err != nil {
		return err
	}

	if _, err := tx.Exec(
		`DELETE FROM group_requests WHERE group_id = ? AND user_id = ? AND type = 'invite'`,
		groupID, userID,
	); err != nil {
		return err
	}

	if _, err := tx.Exec(
		`INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)`,
		groupID, userID,
	); err != nil {
		return err
	}

	return tx.Commit()
}

func DeclineGroupInvite(groupID, userID int) error {
	_, err := database.DB.Exec(
		`DELETE FROM group_requests WHERE group_id = ? AND user_id = ? AND type = 'invite'`,
		groupID, userID,
	)
	return err
}

func scanGroupRequests(rows *sql.Rows) ([]*models.GroupRequest, error) {
	var requests []*models.GroupRequest
	for rows.Next() {
		r := &models.GroupRequest{}
		if err := rows.Scan(
			&r.ID, &r.GroupID, &r.UserID, &r.Type, &r.CreatedAt,
			&r.FirstName, &r.LastName, &r.Nickname, &r.AvatarPath,
		); err != nil {
			return nil, err
		}
		requests = append(requests, r)
	}
	if requests == nil {
		requests = []*models.GroupRequest{}
	}
	return requests, rows.Err()
}
