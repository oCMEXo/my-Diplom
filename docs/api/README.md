# Collab API documentation

The REST API of Collab is described in **OpenAPI 3.0**. The description is made from the code: every
route checks its input and output with Zod schemas, and the same schemas become the models in the
document. Summaries, examples and error messages for each endpoint are in
[apps/api/src/openapi/operations.ts](../../apps/api/src/openapi/operations.ts).

## Where to read it

| What | Where |
|---|---|
| The specification as files | [openapi.yaml](openapi.yaml), [openapi.json](openapi.json) |
| Swagger UI (try requests in the browser) | http://localhost:3001/docs · live: https://35-228-155-63.sslip.io/api/docs |
| Redoc (easier to read) | http://localhost:3001/docs/reference · live: https://35-228-155-63.sslip.io/api/docs/reference |
| First steps | [getting-started.md](getting-started.md) |
| Guide: build a team project | [guides/team-project.md](guides/team-project.md) |
| Guide: run code and read the output live | [guides/run-code.md](guides/run-code.md) |
| Real-time protocols (Yjs sync, `/ws` events, terminal) | [../websocket-protocol.md](../websocket-protocol.md) |

## What is in the specification

- 63 endpoints in 9 groups, each with a summary, a description and an `operationId`
- an example for every request body and every response
- every status code an endpoint can return, with the real error messages
- 60 named data models (`User`, `Project`, `File`, `Message`, `Class`, …) in `components/schemas`
- shared responses for 401, 429 and 500, and the `bearerAuth` security scheme

## Keeping it correct

```bash
pnpm api:docs   # writes docs/api/openapi.json and openapi.yaml from the code
pnpm api:lint   # checks the file with Redocly: OpenAPI rules, and every example against its schema
```

The API tests ([openapi.test.ts](../../apps/api/src/openapi/openapi.test.ts)) fail when:

- an endpoint has no documentation, or the documentation names an endpoint that does not exist
- a request or a response has no example
- the saved `openapi.json`/`openapi.yaml` are older than the code
- an endpoint marked as needing a token answers without one (each one is called without a token and
  must return 401)

GitHub Actions runs the tests and `pnpm api:lint` on every push.

## Conventions

- **Base URL:** `http://localhost:3001` locally, `https://35-228-155-63.sslip.io/api` on the live demo.
- **Format:** JSON in and out, UTF-8. Times are ISO 8601 in UTC. Ids are UUIDs.
- **Authentication:** `Authorization: Bearer <accessToken>`. The access token lives 15 minutes; renew
  it with `POST /auth/refresh`.
- **Errors:** always `{ "message": "…" }`, written so it can be shown to a person.
- **Rate limits:** 429 with the number of seconds to wait. Sign-in and sign-up have a stricter limit.
- **Paging:** the chat uses a cursor: `GET /projects/{projectId}/messages?before=<message id>&limit=50`.

## Endpoints

### auth

Accounts, sign-in, tokens, e-mail confirmation and password reset.

| Endpoint | What it does | Token |
|---|---|---|
| `POST /auth/register` | Create an account | no |
| `POST /auth/login` | Sign in | no |
| `POST /auth/guest` | Continue as a guest | no |
| `POST /auth/refresh` | Get new tokens | no |
| `POST /auth/logout` | Sign out | no |
| `GET /auth/me` | Check the access token | yes |
| `PATCH /auth/me` | Change the name others see | yes |
| `POST /auth/upgrade` | Keep a guest account | yes |
| `POST /auth/delete-account` | Delete the account | yes |
| `POST /auth/forgot-password` | Ask for a password reset link | no |
| `POST /auth/reset-password` | Set a new password | no |
| `POST /auth/verify-email` | Confirm the e-mail address | no |
| `POST /auth/resend-verification` | Send the confirmation link again | yes |
| `GET /auth/github/start` | Start signing in with GitHub | no |
| `GET /auth/github/callback` | GitHub sends the browser back here | no |
| `POST /auth/github/exchange` | Finish signing in with GitHub | no |

### projects

Projects, members and invite links.

| Endpoint | What it does | Token |
|---|---|---|
| `POST /projects` | Create a project | yes |
| `GET /projects` | List my projects | yes |
| `GET /projects/{projectId}` | Get a project with its members | yes |
| `DELETE /projects/{projectId}` | Delete a project | yes |
| `POST /projects/{projectId}/members` | Add a member by e-mail | yes |
| `PATCH /projects/{projectId}/members/{userId}` | Change a member's role | yes |
| `DELETE /projects/{projectId}/members/{userId}` | Remove a member, or leave the project | yes |
| `POST /projects/{projectId}/invite/regenerate` | Make a new invite link | yes |
| `PATCH /projects/{projectId}/invite` | Choose the role the invite link gives | yes |
| `GET /join/{code}` | See where an invite link leads | no |
| `POST /join/{code}` | Join a project by invite link | yes |

### files

Files, trash, versions, search and export.

| Endpoint | What it does | Token |
|---|---|---|
| `GET /projects/{projectId}/files` | List files | yes |
| `POST /projects/{projectId}/files` | Create a file | yes |
| `GET /projects/{projectId}/files/trash` | List files in the trash | yes |
| `POST /projects/{projectId}/files/{fileId}/restore` | Restore a file from the trash | yes |
| `DELETE /projects/{projectId}/files/{fileId}/permanent` | Delete a file for good | yes |
| `GET /projects/{projectId}/files/{fileId}` | Get one file | yes |
| `PATCH /projects/{projectId}/files/{fileId}` | Rename or move a file, or set its language | yes |
| `DELETE /projects/{projectId}/files/{fileId}` | Move a file to the trash | yes |
| `GET /projects/{projectId}/files/{fileId}/versions` | List saved versions of a file | yes |
| `GET /projects/{projectId}/files/{fileId}/versions/{versionId}` | Get the text of a version | yes |
| `POST /projects/{projectId}/files/{fileId}/versions/{versionId}/restore` | Restore a version | yes |
| `GET /projects/{projectId}/search` | Search the text of all files | yes |
| `GET /projects/{projectId}/export` | Download the project as a ZIP | yes |

### chat

Project chat.

| Endpoint | What it does | Token |
|---|---|---|
| `GET /projects/{projectId}/messages` | Read the chat | yes |
| `POST /projects/{projectId}/messages` | Send a chat message | yes |

### classes

Classes: a teacher gives a task, every student gets an own copy.

| Endpoint | What it does | Token |
|---|---|---|
| `POST /projects/{projectId}/class` | Turn a project into a class task | yes |
| `GET /classes` | List my classes | yes |
| `GET /classes/{classId}` | See a class with its students | yes |
| `DELETE /classes/{classId}` | Close a class | yes |
| `POST /classes/{classId}/regenerate-link` | Make a new class link | yes |
| `GET /class-links/{code}` | See where a class link leads | no |
| `POST /class-links/{code}/join` | Join a class | yes |

### runs

Running code and the terminal.

| Endpoint | What it does | Token |
|---|---|---|
| `GET /features` | Find out what this server can do | no |
| `POST /run-access` | Check a run access code | no |
| `POST /projects/{projectId}/files/{fileId}/run` | Run a code file | yes |
| `POST /projects/{projectId}/runs/{runId}/stop` | Stop a running program | yes |
| `POST /projects/{projectId}/terminal` | Open a terminal | yes |

### import

Import from GitHub.

| Endpoint | What it does | Token |
|---|---|---|
| `POST /projects/{projectId}/import/github` | Import a public GitHub repository | yes |

### github

Push to GitHub and switch branches.

| Endpoint | What it does | Token |
|---|---|---|
| `POST /projects/{projectId}/github/branches` | List the branches of the linked repository | yes |
| `POST /projects/{projectId}/github/preview` | See what a push would change | yes |
| `POST /projects/{projectId}/github/push` | Push the project to GitHub | yes |
| `GET /projects/{projectId}/branches` | List branches of an imported repository | yes |
| `POST /projects/{projectId}/branch` | Switch the branch for everyone | yes |

### health

Health checks and error reports.

| Endpoint | What it does | Token |
|---|---|---|
| `GET /health` | Check that the API is up | no |
| `GET /health/ready` | Check the database and Redis | no |
| `POST /client-errors` | Report an error from the web app | no |
