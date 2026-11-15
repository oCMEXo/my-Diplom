# Data dictionary

Database: PostgreSQL 16. The structure is defined by the Prisma schema
([`packages/db/prisma/schema.prisma`](../../packages/db/prisma/schema.prisma)) and is created only by
migrations ([`packages/db/prisma/migrations`](../../packages/db/prisma/migrations)). The full DDL of the
final structure in one file: [`schema.sql`](schema.sql).

General rules:

- Primary keys are UUIDs in a `TEXT` column. The app creates the value (Prisma `@default(uuid())`).
- Time is stored as `TIMESTAMP(3)` (milliseconds), always in UTC, as Prisma writes it.
- Table and column names in the database are `snake_case`. In the code the same fields are `camelCase`
  (for example, `password_hash` ↔ `passwordHash`).
- Foreign keys update in cascade (`ON UPDATE CASCADE`). The delete behaviour is given for each key.
- Passwords, keys and tokens are never stored in plain form, only their hashes.

## Enumerations (ENUM)

| Type | Values | Used in |
|---|---|---|
| `ProjectRole` | `owner`, `editor`, `viewer` | `projects.invite_role`, `project_members.role` |
| `FileKind` | `code` (code), `doc` (Markdown document), `board` (whiteboard) | `files.type` |

## users: users and guests

Registered users and guests who joined by an invite link.

| Column | Type | NULL | Default | Key / constraint | Description |
|---|---|---|---|---|---|
| `id` | `TEXT` | no | UUID (app) | PK `users_pkey` | User id |
| `email` | `TEXT` | no | — | UNIQUE `users_email_key` | Sign-in address, in lower case. A guest gets a technical address `guest-<uuid>@guest.local` |
| `name` | `TEXT` | no | — | — | Display name (on the cursor and in the chat). For a guest, the name they entered or "Guest NNNN" |
| `password_hash` | `TEXT` | no | — | — | Argon2id password hash. For a guest, the hash of a random value, so nobody can sign in with a password |
| `is_guest` | `BOOLEAN` | no | `false` | — | Guest account without email and password |
| `created_at` | `TIMESTAMP(3)` | no | `CURRENT_TIMESTAMP` | — | Registration time |

## refresh_tokens: sign-in sessions

Long-lived refresh tokens. Only the browser knows the token itself; the database keeps its hash.

| Column | Type | NULL | Default | Key / constraint | Description |
|---|---|---|---|---|---|
| `id` | `TEXT` | no | UUID (app) | PK `refresh_tokens_pkey` | Record id |
| `user_id` | `TEXT` | no | — | FK → `users.id`, `ON DELETE CASCADE`; index `refresh_tokens_user_id_idx` | Session owner |
| `token_hash` | `TEXT` | no | — | index `refresh_tokens_token_hash_idx` | SHA-256 of the refresh token; the session is found by it on refresh |
| `expires_at` | `TIMESTAMP(3)` | no | — | — | When the token stops working |
| `created_at` | `TIMESTAMP(3)` | no | `CURRENT_TIMESTAMP` | — | Issue time |

## projects: projects

| Column | Type | NULL | Default | Key / constraint | Description |
|---|---|---|---|---|---|
| `id` | `TEXT` | no | UUID (app) | PK `projects_pkey` | Project id |
| `name` | `TEXT` | no | — | — | Name |
| `owner_id` | `TEXT` | no | — | FK → `users.id`, `ON DELETE RESTRICT` | Owner. A user with projects cannot be deleted: when an account is deleted, the app deletes its projects first |
| `invite_code` | `TEXT` | no | — | UNIQUE `projects_invite_code_key` | Secret of the invite link. A new code makes the old link invalid |
| `invite_role` | `ProjectRole` | no | `'editor'` | — | Role that people who join by the link get |
| `github_owner` | `TEXT` | yes | — | — | Owner of the linked GitHub repository |
| `github_repo` | `TEXT` | yes | — | — | Name of the linked repository |
| `github_branch` | `TEXT` | yes | — | — | Active branch of the project |
| `created_at` | `TIMESTAMP(3)` | no | `CURRENT_TIMESTAMP` | — | Creation time |

## project_members: project members

A many-to-many link between users and projects, with a role. The owner is also stored here, with the role `owner`.

| Column | Type | NULL | Default | Key / constraint | Description |
|---|---|---|---|---|---|
| `project_id` | `TEXT` | no | — | PK (`project_id`, `user_id`); FK → `projects.id`, `ON DELETE CASCADE` | Project |
| `user_id` | `TEXT` | no | — | PK (`project_id`, `user_id`); FK → `users.id`, `ON DELETE CASCADE` | Member |
| `role` | `ProjectRole` | no | `'editor'` | — | Rights: `owner` can do everything, `editor` can edit, `viewer` can only read |

## files: project files

Code, documents and boards. The content is stored as the state of a Yjs (CRDT) document.

| Column | Type | NULL | Default | Key / constraint | Description |
|---|---|---|---|---|---|
| `id` | `TEXT` | no | UUID (app) | PK `files_pkey` | File id |
| `project_id` | `TEXT` | no | — | FK → `projects.id`, `ON DELETE CASCADE`; part of UNIQUE `files_project_id_branch_path_key` | Project |
| `path` | `TEXT` | no | — | part of UNIQUE `files_project_id_branch_path_key` | Path inside the project, for example `src/app.js` |
| `branch` | `TEXT` | no | `''` | part of UNIQUE `files_project_id_branch_path_key` | GitHub branch the file belongs to; `''` for a project without a repository |
| `type` | `FileKind` | no | `'code'` | — | Kind of file: code, document or board |
| `language` | `TEXT` | yes | — | — | Highlighting language, if set by hand |
| `yjs_state` | `BYTEA` | yes | — | — | Binary state of the Yjs document; empty for a new file |
| `source_sha` | `TEXT` | yes | — | — | Git blob SHA at the last sync with GitHub; shows what has changed |
| `updated_at` | `TIMESTAMP(3)` | no | — (set by the app) | — | Time of the last change |
| `deleted_at` | `TIMESTAMP(3)` | yes | — | — | When the file was moved to the trash; `NULL` if it is not deleted. After 30 days it is deleted for good |
| `trashed_path` | `TEXT` | yes | — | — | Original path of a deleted file, to restore it in its place |

## file_versions: file versions

Earlier states of code and documents as text. The sync server keeps at most 50 versions per file.

| Column | Type | NULL | Default | Key / constraint | Description |
|---|---|---|---|---|---|
| `id` | `TEXT` | no | UUID (app) | PK `file_versions_pkey` | Version id |
| `file_id` | `TEXT` | no | — | FK → `files.id`, `ON DELETE CASCADE`; index `file_versions_file_id_created_at_idx` (`file_id`, `created_at`) | File |
| `content` | `TEXT` | no | — | — | Text of the file in this version |
| `size` | `INTEGER` | no | — | — | Size of the text in UTF-8 bytes, so the version list does not load the content |
| `author_id` | `TEXT` | yes | — | FK → `users.id`, `ON DELETE SET NULL` | Whose edit was saved; `NULL` if the account was deleted |
| `created_at` | `TIMESTAMP(3)` | no | `CURRENT_TIMESTAMP` | part of the index | Snapshot time |

## messages: project chat

| Column | Type | NULL | Default | Key / constraint | Description |
|---|---|---|---|---|---|
| `id` | `TEXT` | no | UUID (app) | PK `messages_pkey` | Message id |
| `project_id` | `TEXT` | no | — | FK → `projects.id`, `ON DELETE CASCADE`; index `messages_project_id_created_at_idx` (`project_id`, `created_at`) | Project |
| `author_id` | `TEXT` | no | — | FK → `users.id`, `ON DELETE RESTRICT` | Author. When an account is deleted, the app deletes its messages first |
| `body` | `TEXT` | no | — | — | Message text |
| `created_at` | `TIMESTAMP(3)` | no | `CURRENT_TIMESTAMP` | part of the index | Send time |

## Indexes and unique constraints

| Name | Table | Columns | Why |
|---|---|---|---|
| `users_email_key` | `users` | `email` | One account per address; lookup at sign-in |
| `projects_invite_code_key` | `projects` | `invite_code` | The link code is unique; finding a project by its link |
| `files_project_id_branch_path_key` | `files` | `project_id`, `branch`, `path` | One branch of a project cannot have two files with the same path |
| `refresh_tokens_user_id_idx` | `refresh_tokens` | `user_id` | All sessions of a user (sign out everywhere) |
| `refresh_tokens_token_hash_idx` | `refresh_tokens` | `token_hash` | Finding the session on every refresh |
| `file_versions_file_id_created_at_idx` | `file_versions` | `file_id`, `created_at` | Version list of a file by time |
| `messages_project_id_created_at_idx` | `messages` | `project_id`, `created_at` | Chat history of a project by time |
