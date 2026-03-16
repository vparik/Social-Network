package models

type User struct {
	ID           int `json:"id"`
	Email        string
	PasswordHash string
	Role         string
	FirstName    string `json:"firstName"`
	LastName     string `json:"lastName"`
	DateOfBirth  string `json:"dateOfBirth"`
	AvatarPath   string `json:"avatarPath"`
	Nickname     string `json:"nickname"`
	AboutMe      string `json:"aboutMe"`
	IsPublic     bool   `json:"isPublic"`
	CreatedAt    int64  `json:"created_at"`
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
}
