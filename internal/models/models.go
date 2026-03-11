package models

type User struct {
	ID           int
	Email        string
	PasswordHash string
	Role         string
	FirstName    string
	LastName     string
	DateOfBirth  string
	AvatarPath   string
	Nickname     string
	AboutMe      string
	IsPublic     bool
	CreatedAt    int64
}

type Post struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	Privacy   string `json:"privacy"`
	CreatedAt int64  `json:"created_at"`
}
