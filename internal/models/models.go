package models

type User struct {
	ID             int `json:"id"`
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

type ProfileResponse struct {
	User           *User `json:"user"`
	CanViewContent bool  `json:"canViewContent"`
	IsOwnProfile   bool  `json:"isOwnProfile"`
}

type Follow struct {
	ID          int   `json:"id"`
	FollowerID  int   `json:"followerId"`
	FollowingID int   `json:"followingId"`
	CreatedAt   int64 `json:"createdAt"`
}

type Post struct {
	ID         int    `json:"id"`
	UserID     int    `json:"userId"`
	Title      string `json:"title"`
	Content    string `json:"content"`
	Privacy    string `json:"privacy"`
	ImageURL   string `json:"imageUrl"`
	CreatedAt  int64  `json:"createdAt"`
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
	Nickname   string `json:"nickname"`
	AvatarPath string `json:"avatarPath"`
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
	ID            int    `json:"id"`
	GroupID       int    `json:"groupId"`
	UserID        int    `json:"userId"`
	Title         string `json:"title"`
	Content       string `json:"content"`
	Location      string `json:"location"`
	EventAt       int64  `json:"eventAt"`
	CreatedAt     int64  `json:"createdAt"`
	GoingCount    int    `json:"goingCount"`
	NotGoingCount int    `json:"notGoingCount"`
	MyVote        string `json:"myVote"` // "" | "GOING" | "NOT-GOING"
}

type Message struct {
	ID         int    `json:"id"`
	SenderID   int    `json:"senderId"`
	ReceiverID int    `json:"receiverId"`
	Content    string `json:"content"`
	SentAt     int64  `json:"sentAt"`
	ReceivedAt int64  `json:"receivedAt"`
	ReadAt     int64  `json:"readAt"`
}

type Group struct {
	ID          int    `json:"id"`
	OwnerID     int    `json:"ownerId"`
	Title       string `json:"title"`
	Description string `json:"description"`
	CreatedAt   int64  `json:"createdAt"`
	MemberCount int    `json:"memberCount"`
	IsMember    bool   `json:"isMember"`
	IsOwner     bool   `json:"isOwner"`
	IsPending   bool   `json:"isPending"`
}

type GroupMember struct {
	GroupID    int    `json:"groupId"`
	UserID     int    `json:"userId"`
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
	Nickname   string `json:"nickname"`
	AvatarPath string `json:"avatarPath"`
	JoinedAt   int64  `json:"joinedAt"`
}

type GroupRequest struct {
	ID         int    `json:"id"`
	GroupID    int    `json:"groupId"`
	UserID     int    `json:"userId"`
	Type       string `json:"type"` // "join_request" | "invite"
	CreatedAt  int64  `json:"createdAt"`
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
	Nickname   string `json:"nickname"`
	AvatarPath string `json:"avatarPath"`
}

type GroupPost struct {
	ID         int    `json:"id"`
	GroupID    int    `json:"groupId"`
	UserID     int    `json:"userId"`
	Title      string `json:"title"`
	Content    string `json:"content"`
	ImageURL   string `json:"imageUrl"`
	CreatedAt  int64  `json:"createdAt"`
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
	Nickname   string `json:"nickname"`
	AvatarPath string `json:"avatarPath"`
}

type GroupComment struct {
	ID         int    `json:"id"`
	PostID     int    `json:"postId"`
	UserID     int    `json:"userId"`
	Content    string `json:"content"`
	ImageURL   string `json:"imageUrl"`
	CreatedAt  int64  `json:"createdAt"`
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
	Nickname   string `json:"nickname"`
	AvatarPath string `json:"avatarPath"`
}

type GroupEvent struct {
	ID            int    `json:"id"`
	GroupID       int    `json:"groupId"`
	UserID        int    `json:"userId"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	EventAt       int64  `json:"eventAt"`
	CreatedAt     int64  `json:"createdAt"`
	GoingCount    int    `json:"goingCount"`
	NotGoingCount int    `json:"notGoingCount"`
	MyVote        string `json:"myVote"` // "" | "going" | "not_going"
}

type GroupMessage struct {
	ID         int    `json:"id"`
	GroupID    int    `json:"groupId"`
	UserID     int    `json:"userId"`
	Content    string `json:"content"`
	SentAt     int64  `json:"sentAt"`
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
	Nickname   string `json:"nickname"`
	AvatarPath string `json:"avatarPath"`
}

type RelationshipChangedPayload struct {
	ActorID  int    `json:"actorId"`
	TargetID int    `json:"targetId"`
	Action   string `json:"action"` // "follow" or "unfollow"
	Entity   string `json:"entity"` // "follow"
	Scope    string `json:"scope"`  // "relationship"
}

type Notification struct {
	ID         int    `json:"id"`
	UserID     int    `json:"userId"`
	ActorID    int    `json:"actorId"`
	Type       string `json:"type"`
	EntityID   *int   `json:"entityId,omitempty"`
	PostID     *int   `json:"postId,omitempty"`
	CommentID  *int   `json:"commentId,omitempty"`
	IsRead     bool   `json:"isRead"`
	CreatedAt  int64  `json:"createdAt"`
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
	Nickname   string `json:"nickname"`
	AvatarPath string `json:"avatarPath"`
}
