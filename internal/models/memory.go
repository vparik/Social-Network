package models

type UserSearchEntry struct {
	ID         int
	FirstName  string
	LastName   string
	Nickname   string
	FullName   string
	SearchBlob string
}

type UserCache struct {
	List []UserSearchEntry
	ByID map[int]*UserSearchEntry
}

type UserMemoryRow struct {
	ID        int
	FirstName string
	LastName  string
	Nickname  string
}
