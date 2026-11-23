# Guide: build a team project

In this guide a script does what two people do in the web app: Anna creates a project, adds a file
and shares an invite link; Boris joins with the link, writes in the chat, and Anna makes him a viewer.

The whole script is [examples/team-project.mjs](../examples/team-project.mjs). It has no
dependencies: Node.js 20+ has `fetch` built in.

```bash
node docs/api/examples/team-project.mjs
API_URL=https://35-228-155-63.sslip.io/api node docs/api/examples/team-project.mjs
```

Real output:

```
1. Anna is signed in as Anna
2. Project created: 2c59b0c0-c41d-4955-b989-5922dc5b3755
3. File created: src/sort.py (python)
4. Invite code: JV7rdKuoOhzc gives the role editor
5. The link leads to "Algorithms homework" by Anna
6. Boris joined the project
7. Anna reads the chat: Boris: Hi! I will write the merge sort.
8. Members: Anna (owner), Boris (editor)
9. Boris is a viewer now. Creating a file fails: POST /projects/…/files failed with 403: You do not have the rights for this in the project
10. Project deleted
```

## Step by step

### A small helper

All calls go through one function. It adds the token, sends JSON and turns an error answer into an
exception with the API's message.

```js
async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${method} ${path} failed with ${response.status}: ${data?.message}`);
  return data;
}
```

### 1. Sign in

`POST /auth/guest` creates an account in one call. With a real user, use `POST /auth/login`.

```js
const anna = await call("POST", "/auth/guest", { body: { name: "Anna" } });
const annaToken = anna.tokens.accessToken;
```

### 2. Create a project

`POST /projects` → `201` with a [Project](../openapi.yaml). The creator is the `owner`.

```js
const project = await call("POST", "/projects", { token: annaToken, body: { name: "Algorithms homework" } });
```

### 3. Add a file

`POST /projects/{projectId}/files`. Folders are part of the path. The language comes from the name
(`.py` → `python`).

```js
const file = await call("POST", `/projects/${project.id}/files`, {
  token: annaToken,
  body: { path: "src/sort.py", type: "code" },
});
```

The same name twice returns `409 {"message":"A file with this name already exists"}`.

### 4. Share the invite link

Every project has an invite code. `PATCH /projects/{projectId}/invite` chooses the role it gives
(`editor` or `viewer`). In the web app the link is `https://<site>/join/<inviteCode>`.

```js
const invite = await call("PATCH", `/projects/${project.id}/invite`, { token: annaToken, body: { role: "editor" } });
```

### 5. Show where the link leads

`GET /join/{code}` needs no token, so the page can show the project before the person signs in.

```js
const preview = await call("GET", `/join/${invite.inviteCode}`);
```

### 6. Join with the link

Boris signs in and calls `POST /join/{code}`. He gets the project with `myRole: "editor"`.

```js
const boris = await call("POST", "/auth/guest", { body: { name: "Boris" } });
await call("POST", `/join/${invite.inviteCode}`, { token: boris.tokens.accessToken });
```

### 7. Chat

`POST /projects/{projectId}/messages` saves a message and sends it to everyone connected to `/ws` as
`message.created`. `GET /projects/{projectId}/messages` returns the latest 50, oldest first; pass
`?before=<message id>` to load older ones.

```js
await call("POST", `/projects/${project.id}/messages`, { token: borisToken, body: { body: "Hi! I will write the merge sort." } });
const messages = await call("GET", `/projects/${project.id}/messages`, { token: annaToken });
```

### 8. See the members

`GET /projects/{projectId}` returns the project with `members`.

### 9. Change a role

`PATCH /projects/{projectId}/members/{userId}` with `{"role":"viewer"}`. A viewer can read and chat,
but not change files: the API answers `403`. If Boris is connected to `/ws`, he gets a
`project.members` event at once.

### 10. Clean up

`DELETE /projects/{projectId}` deletes the project. Only the owner can do it. A member who wants to
leave calls `DELETE /projects/{projectId}/members/{their own userId}`.

## What next

- Real-time events and the text of files: [websocket-protocol.md](../../websocket-protocol.md)
- [Guide: run code and read the output live](run-code.md)
