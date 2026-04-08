package memory

import (
	"socialnet/internal/models"
	"strings"
	"sync"
)

var (
	usersCache models.UserCache
	usersMu    sync.RWMutex
)

func buildUserSearchEntry(id int, firstName, lastName, nickname string) models.UserSearchEntry {
	entry := models.UserSearchEntry{
		ID:        id,
		FirstName: firstName,
		LastName:  lastName,
		Nickname:  nickname,
		FullName:  strings.TrimSpace(firstName + " " + lastName),
	}

	entry.SearchBlob = strings.ToLower(
		entry.FirstName + " " +
			entry.LastName + " " +
			entry.Nickname + " " +
			entry.FullName,
	)

	return entry
}

func LoadUserCache(rows []models.UserMemoryRow) {
	usersMu.Lock()
	defer usersMu.Unlock()

	usersCache = models.UserCache{
		List: make([]models.UserSearchEntry, 0, len(rows)),
		ByID: make(map[int]*models.UserSearchEntry, len(rows)),
	}

	for _, row := range rows {
		entry := buildUserSearchEntry(row.ID, row.FirstName, row.LastName, row.Nickname)
		usersCache.List = append(usersCache.List, entry)
	}

	for i := range usersCache.List {
		usersCache.ByID[usersCache.List[i].ID] = &usersCache.List[i]
	}
}

func AddToUserMemory(id int, firstName, lastName, nickname string) {
	usersMu.Lock()
	defer usersMu.Unlock()

	if _, exists := usersCache.ByID[id]; exists {
		return
	}

	entry := buildUserSearchEntry(id, firstName, lastName, nickname)
	usersCache.List = append(usersCache.List, entry)
	usersCache.ByID[entry.ID] = &usersCache.List[len(usersCache.List)-1]
}

func UpdateUserMemory(id int, firstName, lastName, nickname string) {
	usersMu.Lock()
	defer usersMu.Unlock()

	entry, exists := usersCache.ByID[id]
	if !exists {
		return
	}

	entry.Nickname = nickname
	entry.SearchBlob = strings.ToLower(
		firstName + " " +
			lastName + " " +
			nickname + " " +
			strings.TrimSpace(firstName+" "+lastName),
	)
}

func GetUserCache() models.UserCache {
	usersMu.RLock()
	defer usersMu.RUnlock()

	snapshot := models.UserCache{
		List: make([]models.UserSearchEntry, len(usersCache.List)),
		ByID: make(map[int]*models.UserSearchEntry, len(usersCache.List)),
	}

	copy(snapshot.List, usersCache.List)

	for i := range snapshot.List {
		snapshot.ByID[snapshot.List[i].ID] = &snapshot.List[i]
	}

	return snapshot
}

func SearchUsers(query string, excludeUserID int) []*models.User {
	query = strings.TrimSpace(strings.ToLower(query))
	if query == "" {
		return []*models.User{}
	}

	cache := GetUserCache()
	results := make([]*models.User, 0, 20)

	for _, entry := range cache.List {
		if entry.ID == excludeUserID {
			continue
		}

		if !strings.Contains(entry.SearchBlob, query) {
			continue
		}

		results = append(results, &models.User{
			ID:        entry.ID,
			FirstName: entry.FirstName,
			LastName:  entry.LastName,
			Nickname:  entry.Nickname,
		})

		if len(results) == 20 {
			break
		}
	}

	return results
}
