package models

type User struct {
	ID           int
	Email        string
	PasswordHash string
	FirstName    string
	LastName     string
	DateOfBirth  string
	AvatarPath   string
	Nickname     string
	AboutMe      string
	Role         string
	IsPublic     bool
	CreatedAt    int64
}
