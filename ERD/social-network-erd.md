erDiagram
    USERS {
        int id PK
        text email UK
        text password_hash
        text first_name
        text last_name
        text date_of_birth
        text avatar_path
        text nickname
        text about_me
        int is_public
        int created_at
    }

    SESSIONS {
        int id PK
        int user_id FK
        text token UK
        int expires_at
    }

    FOLLOWERS {
        int id PK
        int follower_id FK
        int following_id FK
        text status
        int created_at
    }

    POSTS {
        int id PK
        int user_id FK
        int group_id FK
        text content
        text image_path
        text privacy
        int created_at
    }

    POST_VIEWERS {
        int post_id FK
        int user_id FK
    }

    COMMENTS {
        int id PK
        int post_id FK
        int user_id FK
        text content
        text image_path
        int created_at
    }

    GROUPS {
        int id PK
        int creator_id FK
        text title
        text description
        int created_at
    }

    GROUP_MEMBERS {
        int id PK
        int group_id FK
        int user_id FK
        int invited_by FK
        text status
        int created_at
    }

    

    NOTIFICATIONS {
        int id PK
        int user_id FK
        int sender_id FK
        text type
        int reference_id
        int is_read
        int created_at
    }

    MESSAGES {
        int id PK
        int sender_id FK
        int receiver_id FK
        int group_id FK
        text content
        int created_at
    }

    %% Auth
    USERS ||--o{ SESSIONS : "has"

    %% Social graph
    USERS ||--o{ FOLLOWERS : "follows (as follower)"
    USERS ||--o{ FOLLOWERS : "followed by (as following)"

    %% Posts & Comments
    USERS ||--o{ POSTS : "creates"
    GROUPS ||--o{ POSTS : "contains"
    POSTS ||--o{ COMMENTS : "has"
    USERS ||--o{ COMMENTS : "writes"
    POSTS ||--o{ POST_VIEWERS : "visible to"
    USERS ||--o{ POST_VIEWERS : "can view"

    %% Groups
    USERS ||--o{ GROUPS : "creates"
    GROUPS ||--o{ GROUP_MEMBERS : "has"
    USERS ||--o{ GROUP_MEMBERS : "joins"

    
    %% Notifications
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ NOTIFICATIONS : "triggers"

    %% Messages
    USERS ||--o{ MESSAGES : "sends"
    USERS ||--o{ MESSAGES : "receives (private)"
    GROUPS ||--o{ MESSAGES : "receives (group chat)"
