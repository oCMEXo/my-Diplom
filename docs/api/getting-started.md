# Getting started with the Collab API

This guide takes about 10 minutes. You start the API on your computer, get a token and make your
first calls. All answers below are real answers from the API.

## 1. Start the API

You need Node.js 20 or newer, pnpm and Docker.

```bash
pnpm install
docker compose -f infra/docker-compose.dev.yml up -d   # Postgres on :5433, Redis on :6380
cp apps/api/.env.example apps/api/.env
cp packages/db/.env.example packages/db/.env
pnpm db:migrate
pnpm dev:api
```

The API listens on `http://localhost:3001`. Check it:

```bash
curl http://localhost:3001/health
```

```json
{"status":"ok"}
```

Instead of running it locally, you can use the live demo at `https://35-228-155-63.sslip.io/api`.

> On Windows, run the commands in Git Bash, or write `curl.exe` instead of `curl` in PowerShell.

## 2. Open the reference

While the API runs, the full reference is in your browser:

- Swagger UI: http://localhost:3001/docs (you can send requests from the page)
- Redoc: http://localhost:3001/docs/reference (easier to read)
- The same description as files: [openapi.yaml](openapi.yaml) and [openapi.json](openapi.json)

## 3. Get a token

Create an account:

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"anna@example.com","password":"correct-horse-42","name":"Anna"}'
```

```json
{
  "user": { "id": "a223629f-106c-4df4-a801-88ba3cae2637", "email": "anna@example.com", "name": "Anna", "isGuest": false, "emailVerified": false },
  "tokens": { "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…", "refreshToken": "4b2f9c1e7a5d…" }
}
```

You don't want an account? `POST /auth/guest` with `{"name":"Anna"}` gives a guest account and the
same kind of tokens.

Save the access token in a variable:

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
```

Check that it works:

```bash
curl http://localhost:3001/auth/me -H "Authorization: Bearer $TOKEN"
```

```json
{"userId":"a223629f-106c-4df4-a801-88ba3cae2637"}
```

In Swagger UI, press **Authorize** and paste the access token (without the word `Bearer`). After that,
"Try it out" sends it with every request.

## 4. Create a project and look at its files

```bash
curl -X POST http://localhost:3001/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My first project","template":"python"}'
```

```json
{
  "id": "676de3bc-8e18-4898-9564-838626327d67",
  "name": "My first project",
  "ownerId": "a223629f-106c-4df4-a801-88ba3cae2637",
  "createdAt": "2026-11-23T19:26:42.779Z",
  "myRole": "owner",
  "inviteCode": "5SoO7wAA2gQE",
  "inviteRole": "editor",
  "github": null,
  "classId": null
}
```

The `python` template adds two files:

```bash
curl http://localhost:3001/projects/676de3bc-8e18-4898-9564-838626327d67/files \
  -H "Authorization: Bearer $TOKEN"
```

```json
[
  { "id": "ee585c5e-bf01-4453-a806-1c583112a244", "projectId": "676de3bc-…", "path": "README.md", "type": "doc", "language": "markdown", "updatedAt": "2026-11-23T19:26:42.779Z" },
  { "id": "650e252b-2f0f-42df-a900-38218b7f7128", "projectId": "676de3bc-…", "path": "main.py", "type": "code", "language": "python", "updatedAt": "2026-11-23T19:26:42.779Z" }
]
```

The text of the files is not here. It lives in the collaboration server and syncs with Yjs over a
WebSocket, see [websocket-protocol.md](../websocket-protocol.md).

## 5. Handle errors

Every error has the same shape, and the message can be shown to a person as it is:

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"anna@example.com","password":"correct-horse-42","name":"Anna"}'
```

```
HTTP/1.1 409 Conflict
{"message":"This email is already registered"}
```

| Status | When |
|---|---|
| 400 | The input is not valid: `{"message":"Please check the form: some fields are not valid."}`, or a rule of the API is broken |
| 401 | No token, a wrong token, or an expired one |
| 403 | You are in the project, but your role does not allow it, or a limit is reached |
| 404 | Not found, or you have no access (the API does not tell which) |
| 409 | Conflict, for example a file with this name already exists |
| 429 | Too many requests. The message says how many seconds to wait |
| 500, 502, 503 | Server error, GitHub failed, or a service is not available right now |

The reference lists the exact messages for every endpoint.

## 6. Keep the session alive

The access token lives 15 minutes. When a call returns 401, get a new pair:

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"4b2f9c1e7a5d…"}'
```

The answer has the same shape as sign-in. A refresh token works only once: using it again returns
`401 {"message":"Your session has expired. Please sign in again."}`. Always save the new pair.

## Next steps

- [Guide: build a team project](guides/team-project.md): files, invite link, a second person, chat and roles
- [Guide: run code and read the output live](guides/run-code.md): the run endpoint and the `/ws` events
