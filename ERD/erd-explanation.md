# ERD — Full Explanation

---

## Users — The Center of Everything

The `USERS` table is the core of the entire database. Almost every other table connects back to it in some way. It stores everything about a person: their login credentials, profile info, and whether their profile is public or private (`is_public`). The password is never stored as plain text — only a `password_hash` produced by bcrypt.

---

## Sessions — Staying Logged In

When a user logs in, a row is created in `SESSIONS`. It stores a random token string that gets sent to the browser as a cookie. Every time the browser makes a request, it sends that cookie, and your server looks up the token in this table to figure out who is making the request. One user can have multiple sessions (logged in on phone and laptop at the same time). When they log out, the session row is deleted.

---

## Followers — The Social Graph

This is the most conceptually interesting table because it's a **self-join** — it connects `USERS` to itself. A row in `FOLLOWERS` means "this person is trying to follow that person." It has two foreign keys both pointing to `USERS`: `follower_id` (the person doing the following) and `following_id` (the person being followed).

The `status` column is either `pending` or `accepted`. When user A sends a follow request to user B, a row is created with `status = 'pending'`. If B has a public profile, it's immediately set to `accepted` and A starts following. If B has a private profile, B has to manually accept before the status changes. The `UNIQUE(follower_id, following_id)` constraint makes sure you can't send the same follow request twice.

---

## Posts — The Feed

A `POSTS` row belongs to a user via `user_id`. The `privacy` column controls who can see it — `'public'` means everyone, `'almost_private'` means only followers, and `'private'` means only a specific hand-picked list of followers. That third case is handled by `POST_VIEWERS`.

The `group_id` column is nullable. When it's `NULL`, the post is a regular feed post. When it has a value, the post belongs to a group. This lets one table handle both cases without needing two separate post tables.

---

## Post Viewers — Private Posts

When a post's privacy is set to `'private'`, the creator picks specific followers who can see it. Each of those allowed users gets a row in `POST_VIEWERS` with the `post_id` and their `user_id`. When fetching posts, your backend checks: is this post private? If yes, is the requesting user in the `POST_VIEWERS` table for this post? If not, don't return it.

---

## Comments

Comments are straightforward — they belong to a post (`post_id`) and were written by a user (`user_id`). They can optionally have an image attached, just like posts. They always inherit the visibility of their parent post — there's no separate privacy setting for comments.

---

## Groups

A `GROUPS` row is created by a user (`creator_id`) and has a title and description. The group itself is just a container. The actual membership, posts, events, and chat are all handled by other tables that reference the group's `id`.

---

## Group Members

`GROUP_MEMBERS` is the junction table that connects users to groups. A row here means a user belongs to (or is trying to join) a group. Like followers, it has a `status` column — `'pending'` when the request or invite is waiting, `'accepted'` when the user is officially a member.

The `invited_by` column tells you *how* they got here. If `invited_by` is `NULL`, the user requested to join on their own and the group creator needs to accept. If `invited_by` has a user ID, that user sent them an invitation and they need to accept it themselves.

---


## Notifications

`NOTIFICATIONS` stores alerts for a user. The `user_id` is the recipient, and `sender_id` is the person who triggered the notification (can be `NULL` if system-generated). The `type` column describes what happened — things like `'follow_request'`, `'group_invite'`, `'group_join_request'`, or `'group_event'`. The `reference_id` stores the ID of whatever the notification is about (the group ID, event ID, etc.) so your frontend knows where to link to. The `is_read` flag marks whether the user has seen it.

---

## Messages

`MESSAGES` handles both private chats and group chats in one table. The key is that exactly one of two columns is set per row: either `receiver_id` (a private message between two users) or `group_id` (a message sent to a group chat). Never both, never neither — this is enforced with a `CHECK` constraint right in the schema. The `sender_id` is always set since every message comes from someone.

---

## How It All Connects

The mental model is simple: `USERS` sits at the center. Every piece of content (posts, comments, messages, events) belongs to a user. Every social action (following, joining groups, responding to events) is a row in a junction table that links two entities together. And every piece of real-time activity (notifications, messages) points back to the users involved. The whole database is just variations of these two patterns — ownership and relationships.
