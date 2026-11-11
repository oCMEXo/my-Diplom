# Словарь данных

СУБД: PostgreSQL 16. Структура задаётся схемой Prisma
([`packages/db/prisma/schema.prisma`](../../packages/db/prisma/schema.prisma)) и создаётся только
миграциями ([`packages/db/prisma/migrations`](../../packages/db/prisma/migrations)). Полный DDL итоговой
структуры одним файлом: [`schema.sql`](schema.sql).

Общие правила:

- Первичные ключи — UUID в столбце типа `TEXT`. Значение создаёт приложение (Prisma `@default(uuid())`).
- Время хранится в `TIMESTAMP(3)` (миллисекунды), всегда в UTC: так его записывает Prisma.
- Имена таблиц и столбцов в базе — `snake_case`. В коде те же поля называются в `camelCase`
  (например, `password_hash` ↔ `passwordHash`).
- Внешние ключи обновляются каскадно (`ON UPDATE CASCADE`). Поведение при удалении указано у каждого ключа.
- Пароли, ключи и токены в базе не хранятся в открытом виде, только их хеши.

## Перечисления (ENUM)

| Тип | Значения | Где используется |
|---|---|---|
| `ProjectRole` | `owner`, `editor`, `viewer` | `projects.invite_role`, `project_members.role` |
| `FileKind` | `code` (код), `doc` (документ Markdown), `board` (доска) | `files.type` |

## users — пользователи и гости

Зарегистрированные пользователи и гости, вошедшие по ссылке-приглашению.

| Поле | Тип | NULL | По умолчанию | Ключ / ограничение | Описание |
|---|---|---|---|---|---|
| `id` | `TEXT` | нет | UUID (приложение) | PK `users_pkey` | Идентификатор пользователя |
| `email` | `TEXT` | нет | — | UNIQUE `users_email_key` | Адрес для входа, в нижнем регистре. У гостя служебный адрес `guest-<uuid>@guest.local` |
| `name` | `TEXT` | нет | — | — | Отображаемое имя (на курсоре и в чате). У гостя введённое имя или «Гость NNNN» |
| `password_hash` | `TEXT` | нет | — | — | Хеш пароля Argon2id. У гостя хеш случайного значения, войти по паролю нельзя |
| `is_guest` | `BOOLEAN` | нет | `false` | — | Гостевая учётная запись без e-mail и пароля |
| `created_at` | `TIMESTAMP(3)` | нет | `CURRENT_TIMESTAMP` | — | Время регистрации |

## refresh_tokens — сессии входа

Долгоживущие ключи обновления сессии. Сам ключ знает только браузер, в базе — его хеш.

| Поле | Тип | NULL | По умолчанию | Ключ / ограничение | Описание |
|---|---|---|---|---|---|
| `id` | `TEXT` | нет | UUID (приложение) | PK `refresh_tokens_pkey` | Идентификатор записи |
| `user_id` | `TEXT` | нет | — | FK → `users.id`, `ON DELETE CASCADE`; индекс `refresh_tokens_user_id_idx` | Владелец сессии |
| `token_hash` | `TEXT` | нет | — | индекс `refresh_tokens_token_hash_idx` | SHA-256 от ключа обновления; по нему ищется сессия при продлении |
| `expires_at` | `TIMESTAMP(3)` | нет | — | — | Когда ключ перестаёт действовать |
| `created_at` | `TIMESTAMP(3)` | нет | `CURRENT_TIMESTAMP` | — | Время выдачи |

## projects — проекты

| Поле | Тип | NULL | По умолчанию | Ключ / ограничение | Описание |
|---|---|---|---|---|---|
| `id` | `TEXT` | нет | UUID (приложение) | PK `projects_pkey` | Идентификатор проекта |
| `name` | `TEXT` | нет | — | — | Название |
| `owner_id` | `TEXT` | нет | — | FK → `users.id`, `ON DELETE RESTRICT` | Владелец. Удалить пользователя, пока у него есть проекты, нельзя: при удалении аккаунта приложение сначала удаляет его проекты |
| `invite_code` | `TEXT` | нет | — | UNIQUE `projects_invite_code_key` | Секрет ссылки-приглашения. Новый код делает старую ссылку недействительной |
| `invite_role` | `ProjectRole` | нет | `'editor'` | — | Роль, которую получает вошедший по ссылке |
| `github_owner` | `TEXT` | да | — | — | Владелец связанного репозитория GitHub |
| `github_repo` | `TEXT` | да | — | — | Имя связанного репозитория |
| `github_branch` | `TEXT` | да | — | — | Активная ветка проекта |
| `created_at` | `TIMESTAMP(3)` | нет | `CURRENT_TIMESTAMP` | — | Время создания |

## project_members — участники проектов

Связь «многие ко многим» между пользователями и проектами с ролью. Владелец тоже записан здесь, с ролью `owner`.

| Поле | Тип | NULL | По умолчанию | Ключ / ограничение | Описание |
|---|---|---|---|---|---|
| `project_id` | `TEXT` | нет | — | PK (`project_id`, `user_id`); FK → `projects.id`, `ON DELETE CASCADE` | Проект |
| `user_id` | `TEXT` | нет | — | PK (`project_id`, `user_id`); FK → `users.id`, `ON DELETE CASCADE` | Участник |
| `role` | `ProjectRole` | нет | `'editor'` | — | Права: `owner` — всё, `editor` — правка, `viewer` — только чтение |

## files — файлы проекта

Код, документы и доски. Содержимое хранится как состояние документа Yjs (CRDT).

| Поле | Тип | NULL | По умолчанию | Ключ / ограничение | Описание |
|---|---|---|---|---|---|
| `id` | `TEXT` | нет | UUID (приложение) | PK `files_pkey` | Идентификатор файла |
| `project_id` | `TEXT` | нет | — | FK → `projects.id`, `ON DELETE CASCADE`; входит в UNIQUE `files_project_id_branch_path_key` | Проект |
| `path` | `TEXT` | нет | — | входит в UNIQUE `files_project_id_branch_path_key` | Путь внутри проекта, например `src/app.js` |
| `branch` | `TEXT` | нет | `''` | входит в UNIQUE `files_project_id_branch_path_key` | Ветка GitHub, к которой относится файл; `''` — проект без репозитория |
| `type` | `FileKind` | нет | `'code'` | — | Вид файла: код, документ или доска |
| `language` | `TEXT` | да | — | — | Язык подсветки, если задан вручную |
| `yjs_state` | `BYTEA` | да | — | — | Двоичное состояние документа Yjs; пусто у нового файла |
| `source_sha` | `TEXT` | да | — | — | SHA блоба Git на момент последней синхронизации с GitHub; по нему видно, что изменилось |
| `updated_at` | `TIMESTAMP(3)` | нет | — (ставит приложение) | — | Время последнего изменения |
| `deleted_at` | `TIMESTAMP(3)` | да | — | — | Время удаления в корзину; `NULL` — файл не удалён. Через 30 дней файл удаляется окончательно |
| `trashed_path` | `TEXT` | да | — | — | Исходный путь удалённого файла, чтобы восстановить его на место |

## file_versions — версии файлов

Прежние состояния кода и документов в виде текста. Сервер синхронизации хранит не больше 50 версий на файл.

| Поле | Тип | NULL | По умолчанию | Ключ / ограничение | Описание |
|---|---|---|---|---|---|
| `id` | `TEXT` | нет | UUID (приложение) | PK `file_versions_pkey` | Идентификатор версии |
| `file_id` | `TEXT` | нет | — | FK → `files.id`, `ON DELETE CASCADE`; индекс `file_versions_file_id_created_at_idx` (`file_id`, `created_at`) | Файл |
| `content` | `TEXT` | нет | — | — | Текст файла в этой версии |
| `size` | `INTEGER` | нет | — | — | Размер текста в байтах UTF-8, чтобы список версий не загружал содержимое |
| `author_id` | `TEXT` | да | — | FK → `users.id`, `ON DELETE SET NULL` | Чья правка сохранена; `NULL`, если аккаунт удалён |
| `created_at` | `TIMESTAMP(3)` | нет | `CURRENT_TIMESTAMP` | входит в индекс | Время снимка |

## messages — чат проекта

| Поле | Тип | NULL | По умолчанию | Ключ / ограничение | Описание |
|---|---|---|---|---|---|
| `id` | `TEXT` | нет | UUID (приложение) | PK `messages_pkey` | Идентификатор сообщения |
| `project_id` | `TEXT` | нет | — | FK → `projects.id`, `ON DELETE CASCADE`; индекс `messages_project_id_created_at_idx` (`project_id`, `created_at`) | Проект |
| `author_id` | `TEXT` | нет | — | FK → `users.id`, `ON DELETE RESTRICT` | Автор. При удалении аккаунта приложение сначала удаляет его сообщения |
| `body` | `TEXT` | нет | — | — | Текст сообщения |
| `created_at` | `TIMESTAMP(3)` | нет | `CURRENT_TIMESTAMP` | входит в индекс | Время отправки |

## Индексы и ограничения уникальности

| Имя | Таблица | Столбцы | Зачем |
|---|---|---|---|
| `users_email_key` | `users` | `email` | Один аккаунт на адрес; поиск при входе |
| `projects_invite_code_key` | `projects` | `invite_code` | Код ссылки уникален; поиск проекта по ссылке |
| `files_project_id_branch_path_key` | `files` | `project_id`, `branch`, `path` | В одной ветке проекта не бывает двух файлов с одним путём |
| `refresh_tokens_user_id_idx` | `refresh_tokens` | `user_id` | Все сессии пользователя (выход со всех устройств) |
| `refresh_tokens_token_hash_idx` | `refresh_tokens` | `token_hash` | Поиск сессии при каждом продлении |
| `file_versions_file_id_created_at_idx` | `file_versions` | `file_id`, `created_at` | Список версий файла по времени |
| `messages_project_id_created_at_idx` | `messages` | `project_id`, `created_at` | История чата проекта по времени |
