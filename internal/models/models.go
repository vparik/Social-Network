package models

type User struct {
	ID             int   `json:"id"`
	Email          string
	PasswordHash   string
	Role           string
	FirstName      string `json:"firstName"`
	LastName       string `json:"lastName"`
	DateOfBirth    string `json:"dateOfBirth"`
	AvatarPath     string `json:"avatarPath"`
	Nickname       string `json:"nickname"`
	AboutMe        string `json:"aboutMe"`
	IsPublic       bool   `json:"isPublic"`
	CreatedAt      int64  `json:"createdAt"`
	FollowersCount int    `json:"followersCount"`
	FollowingCount int    `json:"followingCount"`
}

type Follow struct {
	ID          int   `json:"id"`
	FollowerID  int   `json:"followerId"`
	FollowingID int   `json:"followingId"`
	CreatedAt   int64 `json:"createdAt"`
}

type Post struct {
	ID        int    `json:"id"`
	UserID    int    `json:"userId"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	Privacy   string `json:"privacy"`
	CreatedAt int64  `json:"createdAt"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Nickname  string `json:"nickname"`
}

type Comment struct {
	ID        int    `json:"id"`
	PostID    int    `json:"postId"`
	UserID    int    `json:"userId"`
	Content   string `json:"content"`
	CreatedAt int64  `json:"createdAt"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Nickname  string `json:"nickname"`
}

type Event struct {
	ID        int    `json:"id"`
	UserID    int    `json:"userId"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	Location  string `json:"location"`
	EventAt   int64  `json:"eventAt"`
	CreatedAt int64  `json:"createdAt"`
}
