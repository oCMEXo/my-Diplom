export interface OperationDoc {
  summary: string;
  description: string;
  auth: boolean;
  runCode?: boolean;
  request?: unknown;
  response?: unknown;
  success?: { status: number; description: string; contentType?: string; headers?: Record<string, string> };
  errors?: Record<number, string | string[]>;
  alsoReturns?: Record<number, unknown>;
}

const id = {
  user: "3f6c2a1e-8b4d-4c7a-9e21-5d0b7f3a9c10",
  user2: "8a1d4e2f-6c3b-4f9e-a7d5-2b8c9e0f1a34",
  project: "b2e7c4d1-9a3f-4e6b-8c25-7f1d0a9e3b56",
  project2: "0d5f8b2a-7e4c-4a1f-9b6d-3e8a2c5f7b90",
  file: "c9a4f2e7-1b6d-4a8c-9e3f-5d2b7a0c4e18",
  file2: "d4b8e1c6-3f9a-4d2e-b7c5-1a6f0e9d8c27",
  version: "e7c3a9f1-5d2b-4e8a-9c6f-0b4d1a7e3f92",
  message: "f1d6b3a8-2e9c-4f7a-8b5d-3c0e6a9f2d41",
  classroom: "a8e2c5f9-4b1d-4e7c-9a3f-6d0b2e8c1f75",
  studentProject: "1c7e9a3d-6f2b-4a8e-b5c1-9d4f0a2e7b63",
  run: "5e9b2d7a-1c4f-4e8b-a6d3-0f7c2e9b4a18",
};

const time = "2026-11-20T10:15:00.000Z";
const later = "2026-11-20T10:42:31.000Z";

const user = { id: id.user, email: "anna@example.com", name: "Anna", isGuest: false, emailVerified: true };
const tokens = {
  accessToken: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzZjZjMmExZSJ9.access-token-signature",
  refreshToken: "4b2f9c1e7a5d8e3f6b0a9c2d5e8f1a4b7c0d3e6f9a2b5c8d1e4f7a0b3c6d9e2f",
};
const project = {
  id: id.project,
  name: "Algorithms homework",
  ownerId: id.user,
  createdAt: time,
  myRole: "owner",
  inviteCode: "k7Qm2xVp9LrT",
  inviteRole: "editor",
  github: null,
  classId: null,
};
const file = { id: id.file, projectId: id.project, path: "main.py", type: "code", language: "python", updatedAt: later };
const message = {
  id: id.message,
  projectId: id.project,
  author: { id: id.user, name: "Anna", isGuest: false },
  body: "I fixed the loop in main.py, please check line 12",
  createdAt: later,
};
const classroom = {
  id: id.classroom,
  name: "Python, group 2",
  taskProjectId: id.project,
  joinCode: "Cl4ssR00mX7q",
  createdAt: time,
  studentCount: 2,
};
const repo = { owner: "octo-school", name: "algorithms" };
const githubErrors = {
  400: ["GitHub did not accept the token: it is not valid or has expired.", "This branch name is not allowed."],
  404: ["Project not found, or you have no access to it", "Repository or branch not found, or the token has no access to it."],
  502: ["Could not reach GitHub. Please try again.", "GitHub returned an error. Please try again."],
};
const projectAccess = {
  403: "You do not have the rights for this in the project",
  404: "Project not found, or you have no access to it",
};
const fileAccess = {
  403: "You do not have the rights for this in the project",
  404: ["Project not found, or you have no access to it", "File not found"],
};

export const operations: Record<string, OperationDoc> = {
  "GET /health": {
    summary: "Check that the API is up",
    description: "Answers at once without touching the database. Use it for a quick liveness check.",
    auth: false,
    response: { status: "ok" },
  },
  "GET /health/ready": {
    summary: "Check the database and Redis",
    description:
      "Checks that PostgreSQL and Redis answer. Returns 200 when both are fine and 503 when one of them is down, so a load balancer can stop sending traffic.",
    auth: false,
    response: { status: "ok", database: "ok", redis: "ok" },
    alsoReturns: { 503: { status: "down", database: "ok", redis: "down" } },
  },
  "GET /features": {
    summary: "Find out what this server can do",
    description:
      "Tells the client which optional features are on: running code (`open`, `code` when an access code is needed, or `off`), password reset by e-mail and sign-in with GitHub.",
    auth: false,
    response: { run: "code", passwordReset: true, githubSignIn: false },
  },
  "POST /run-access": {
    summary: "Check a run access code",
    description:
      "On servers where running code needs an access code, checks the code before the client saves it. Send the same code later in the `X-Run-Code` header.",
    auth: false,
    request: { code: "spring-2026" },
    success: { status: 204, description: "The code is right" },
    errors: { 403: ["Wrong access code", "Running code is turned off on this server"] },
  },

  "POST /auth/register": {
    summary: "Create an account",
    description:
      "Creates an account with an e-mail and a password (8 to 72 characters) and signs the person in. If the server can send e-mail, a confirmation link is sent; until then `emailVerified` is `false`.",
    auth: false,
    request: { email: "anna@example.com", password: "correct-horse-42", name: "Anna" },
    response: { user: { ...user, emailVerified: false }, tokens },
    errors: { 409: "This email is already registered" },
  },
  "POST /auth/login": {
    summary: "Sign in",
    description: "Signs in with an e-mail and a password. The access token lives 15 minutes, the refresh token 30 days.",
    auth: false,
    request: { email: "anna@example.com", password: "correct-horse-42" },
    response: { user, tokens },
    errors: { 401: "Wrong email or password" },
  },
  "POST /auth/guest": {
    summary: "Continue as a guest",
    description:
      "Creates a guest account without an e-mail. A guest can join projects by invite link and later keep the account with `POST /auth/upgrade`. Without a name the server picks one, like `Guest 4821`.",
    auth: false,
    request: { name: "Boris" },
    response: {
      user: { id: id.user2, email: "guest-8a1d4e2f@guest.local", name: "Boris", isGuest: true, emailVerified: false },
      tokens,
    },
  },
  "POST /auth/refresh": {
    summary: "Get new tokens",
    description:
      "Swaps a refresh token for a new pair of tokens. Each refresh token works once: the old one stops working, so always save the new pair.",
    auth: false,
    request: { refreshToken: tokens.refreshToken },
    response: { user, tokens },
    errors: { 401: "Your session has expired. Please sign in again." },
  },
  "POST /auth/logout": {
    summary: "Sign out",
    description: "Revokes the refresh token. The access token stops working when it expires.",
    auth: false,
    request: { refreshToken: tokens.refreshToken },
    success: { status: 204, description: "Signed out" },
  },
  "GET /auth/me": {
    summary: "Check the access token",
    description: "Returns the id of the user the token belongs to. Handy to check that a saved token still works.",
    auth: true,
    response: { userId: id.user },
  },
  "PATCH /auth/me": {
    summary: "Change the name others see",
    description: "Changes the display name shown in presence, chat and the member list.",
    auth: true,
    request: { name: "Anna K." },
    response: { ...user, name: "Anna K." },
  },
  "POST /auth/upgrade": {
    summary: "Keep a guest account",
    description: "Turns the current guest account into a full one with an e-mail and a password. Projects and edits stay.",
    auth: true,
    request: { email: "boris@example.com", password: "another-secret-7" },
    response: { id: id.user2, email: "boris@example.com", name: "Boris", isGuest: false, emailVerified: false },
    errors: { 400: "This is already a full account", 409: "This email is already registered" },
  },
  "POST /auth/delete-account": {
    summary: "Delete the account",
    description:
      "Deletes the account, the projects it owns, its chat messages and its memberships. A full account must send its password; a guest sends an empty body.",
    auth: true,
    request: { password: "correct-horse-42" },
    success: { status: 204, description: "The account is deleted" },
    errors: { 403: "Wrong password" },
  },
  "POST /auth/forgot-password": {
    summary: "Ask for a password reset link",
    description:
      "Sends a reset link if an account with this e-mail exists. The answer is always 204, so nobody can find out which addresses have accounts.",
    auth: false,
    request: { email: "anna@example.com" },
    success: { status: 204, description: "If the account exists, the e-mail is on its way" },
  },
  "POST /auth/reset-password": {
    summary: "Set a new password",
    description: "Sets a new password with the token from the reset link. The token works once and for one hour. All sessions are signed out.",
    auth: false,
    request: { token: "Zt3kP9vQ2mX7rL5wN8cB4yH6", password: "new-secret-2026" },
    success: { status: 204, description: "The password is changed" },
    errors: { 400: "This link is not valid or has expired. Ask for a new one." },
  },
  "POST /auth/verify-email": {
    summary: "Confirm the e-mail address",
    description: "Confirms the address with the token from the confirmation link (it works for 3 days) and returns the updated user.",
    auth: false,
    request: { token: "Vx8nR2kT5pQ9mW3zL7cY4bJ6" },
    response: user,
    errors: { 400: "This link is not valid or has expired. Ask for a new one." },
  },
  "POST /auth/resend-verification": {
    summary: "Send the confirmation link again",
    description: "Sends a new confirmation link to the current user's address.",
    auth: true,
    success: { status: 204, description: "The e-mail is on its way" },
    errors: { 400: "A guest has no email to confirm" },
  },
  "GET /auth/github/start": {
    summary: "Start signing in with GitHub",
    description:
      "Open this address in the browser (not with fetch). It redirects to GitHub. After that the browser comes back to the web app at `/auth/github#code=…`, and the app swaps the code with `POST /auth/github/exchange`.",
    auth: false,
    success: { status: 302, description: "Redirect to GitHub", headers: { Location: "https://github.com/login/oauth/authorize?client_id=…&state=…" } },
    errors: { 404: "Sign-in with GitHub is not set up on this server" },
  },
  "GET /auth/github/callback": {
    summary: "GitHub sends the browser back here",
    description:
      "GitHub calls this address after the person agrees. The API redirects the browser to the web app with a one-time code (or an error) in the address hash. Clients do not call it themselves.",
    auth: false,
    success: { status: 302, description: "Redirect to the web app", headers: { Location: "https://collab.example.com/auth/github#code=…&redirect=%2F" } },
  },
  "POST /auth/github/exchange": {
    summary: "Finish signing in with GitHub",
    description: "Swaps the one-time code from the address hash for tokens. The code works once and for one minute.",
    auth: false,
    request: { code: "Gh7tQ2mX9pR4vL8kN3cW6zB5" },
    response: { user, tokens },
    errors: { 400: ["The sign-in link has expired. Please try again.", "Your GitHub account has no confirmed email. Confirm one on GitHub and try again."] },
  },

  "POST /projects": {
    summary: "Create a project",
    description:
      "Creates a project owned by the current user. With `template` the project starts with a ready example (`python` or `javascript`): a guide and code that runs.",
    auth: true,
    request: { name: "Algorithms homework", template: "python" },
    response: project,
    errors: { 403: "You have reached the limit of 100 projects. Delete an old project to make room." },
  },
  "GET /projects": {
    summary: "List my projects",
    description: "Lists the projects where the user is the owner, an editor or a viewer, newest first.",
    auth: true,
    response: [project, { ...project, id: id.project2, name: "Team notes", ownerId: id.user2, myRole: "editor", inviteCode: null }],
  },
  "GET /projects/{projectId}": {
    summary: "Get a project with its members",
    description: "Returns the project, the current user's role in it and the list of members.",
    auth: true,
    response: {
      ...project,
      members: [
        { userId: id.user, name: "Anna", role: "owner" },
        { userId: id.user2, name: "Boris", role: "editor" },
      ],
    },
    errors: projectAccess,
  },
  "DELETE /projects/{projectId}": {
    summary: "Delete a project",
    description: "Only the owner can delete a project. All files, versions and chat messages go with it, and every member is told over the WebSocket. To leave a project, remove yourself with `DELETE /projects/{projectId}/members/{userId}`.",
    auth: true,
    success: { status: 204, description: "The project is deleted" },
    errors: projectAccess,
  },
  "POST /projects/{projectId}/members": {
    summary: "Add a member by e-mail",
    description: "The owner adds a person who already has an account. For everyone else use the invite link.",
    auth: true,
    request: { email: "boris@example.com", role: "editor" },
    response: { userId: id.user2, name: "Boris", role: "editor" },
    errors: {
      ...projectAccess,
      404: ["Project not found, or you have no access to it", "No user with this email. They need to sign up first"],
      409: "This person is already in the project",
    },
  },
  "PATCH /projects/{projectId}/members/{userId}": {
    summary: "Change a member's role",
    description: "The owner makes a member an editor or a viewer. The member sees the change at once over the WebSocket.",
    auth: true,
    request: { role: "viewer" },
    success: { status: 204, description: "The role is changed" },
    errors: {
      ...projectAccess,
      400: "The owner's role cannot be changed",
      404: ["Project not found, or you have no access to it", "Member not found"],
    },
  },
  "DELETE /projects/{projectId}/members/{userId}": {
    summary: "Remove a member, or leave the project",
    description: "The owner removes a member, or a member removes themselves to leave the project. The person loses access at once.",
    auth: true,
    success: { status: 204, description: "The member is removed" },
    errors: {
      400: ["The owner cannot be removed from the project. The project can only be deleted", "The teacher of the class stays in the project"],
      403: "Only the owner can remove other members",
      404: ["Project not found, or you have no access to it", "Member not found"],
    },
  },
  "POST /projects/{projectId}/invite/regenerate": {
    summary: "Make a new invite link",
    description: "Creates a new invite code. The old link stops working.",
    auth: true,
    response: { inviteCode: "p3Rt8wQz2YxK", inviteRole: "editor" },
    errors: projectAccess,
  },
  "PATCH /projects/{projectId}/invite": {
    summary: "Choose the role the invite link gives",
    description: "Sets whether people who join by the link become editors or viewers.",
    auth: true,
    request: { role: "viewer" },
    response: { inviteCode: "k7Qm2xVp9LrT", inviteRole: "viewer" },
    errors: projectAccess,
  },
  "GET /join/{code}": {
    summary: "See where an invite link leads",
    description: "Shows the project name, the owner and the role before the person joins. Works without signing in.",
    auth: false,
    response: { projectName: "Algorithms homework", ownerName: "Anna", role: "editor" },
    errors: { 404: "The invite link is not valid or has expired" },
  },
  "POST /join/{code}": {
    summary: "Join a project by invite link",
    description: "Adds the current user to the project with the role of the link. If the user is already a member, nothing changes.",
    auth: true,
    response: { ...project, ownerId: id.user, myRole: "editor" },
    errors: { 404: "The invite link is not valid or has expired" },
  },

  "GET /projects/{projectId}/files": {
    summary: "List files",
    description: "Lists the files of the project (not the ones in the trash). The text of a file is not here: it comes over the collaboration WebSocket.",
    auth: true,
    response: [file, { ...file, id: id.file2, path: "docs/notes.md", type: "doc", language: "markdown" }],
    errors: projectAccess,
  },
  "POST /projects/{projectId}/files": {
    summary: "Create a file",
    description:
      "Creates an empty file. `path` may contain folders (`src/app.py`). `type` is `code`, `doc` (Markdown) or `board` (a drawing board). The language is guessed from the name when it is not given.",
    auth: true,
    request: { path: "utils/sort.py", type: "code" },
    response: { ...file, id: id.file2, path: "utils/sort.py", updatedAt: time },
    errors: {
      ...projectAccess,
      403: ["You do not have the rights for this in the project", "This project has reached the limit of 2000 files."],
      409: "A file with this name already exists",
    },
  },
  "GET /projects/{projectId}/files/trash": {
    summary: "List files in the trash",
    description: "Deleted files stay in the trash for 30 days. `purgeAt` says when a file is deleted for good.",
    auth: true,
    response: [{ ...file, id: id.file2, path: "old.py", deletedAt: later, purgeAt: "2026-12-20T10:42:31.000Z" }],
    errors: projectAccess,
  },
  "POST /projects/{projectId}/files/{fileId}/restore": {
    summary: "Restore a file from the trash",
    description: "Brings the file back with its content and history.",
    auth: true,
    response: { ...file, id: id.file2, path: "old.py" },
    errors: {
      ...projectAccess,
      404: ["Project not found, or you have no access to it", "The file is not in the trash"],
      409: "A file with this name already exists. Rename or delete it to restore this one",
    },
  },
  "DELETE /projects/{projectId}/files/{fileId}/permanent": {
    summary: "Delete a file for good",
    description: "Deletes a file from the trash. This cannot be undone.",
    auth: true,
    success: { status: 204, description: "The file is gone" },
    errors: { ...projectAccess, 404: ["Project not found, or you have no access to it", "The file is not in the trash"] },
  },
  "GET /projects/{projectId}/files/{fileId}": {
    summary: "Get one file",
    description: "Returns the file's name, type and language.",
    auth: true,
    response: file,
    errors: fileAccess,
  },
  "PATCH /projects/{projectId}/files/{fileId}": {
    summary: "Rename or move a file, or set its language",
    description: "Change `path` to rename or move the file. Set `language` to `null` to guess it from the name again.",
    auth: true,
    request: { path: "src/main.py" },
    response: { ...file, path: "src/main.py" },
    errors: { ...fileAccess, 409: "A file with this name already exists" },
  },
  "DELETE /projects/{projectId}/files/{fileId}": {
    summary: "Move a file to the trash",
    description: "The file can be restored for 30 days.",
    auth: true,
    success: { status: 204, description: "The file is in the trash" },
    errors: fileAccess,
  },
  "GET /projects/{projectId}/files/{fileId}/versions": {
    summary: "List saved versions of a file",
    description: "The collaboration server saves a version when people stop typing. Newest first, without the text.",
    auth: true,
    response: [
      { id: id.version, createdAt: later, size: 412, authorName: "Anna" },
      { id: "2b6d9f1a-4c8e-4a3b-9d7f-1e5a8c2b6d40", createdAt: time, size: 318, authorName: null },
    ],
    errors: fileAccess,
  },
  "GET /projects/{projectId}/files/{fileId}/versions/{versionId}": {
    summary: "Get the text of a version",
    description: "Returns one saved version with its full text, for example to show a diff.",
    auth: true,
    response: { id: id.version, createdAt: later, size: 42, authorName: "Anna", content: 'def greet(name):\n    return f"Hello, {name}!"\n' },
    errors: { ...fileAccess, 404: ["Project not found, or you have no access to it", "File not found", "Version not found"] },
  },
  "POST /projects/{projectId}/files/{fileId}/versions/{versionId}/restore": {
    summary: "Restore a version",
    description: "Puts the text of the version back into the live file. Everyone who has the file open sees the change.",
    auth: true,
    success: { status: 204, description: "The version is restored" },
    errors: {
      ...fileAccess,
      404: ["Project not found, or you have no access to it", "Version not found"],
      502: "Could not restore the version: the collaboration server returned an error",
      503: "The collaboration server is not available. Please try later",
    },
  },
  "GET /projects/{projectId}/search": {
    summary: "Search the text of all files",
    description: "Finds text in every file of the project, ignoring case. At most 50 matches per file and 500 in total; `truncated` says that there were more.",
    auth: true,
    response: {
      files: [
        {
          fileId: id.file,
          path: "main.py",
          matches: [{ line: 3, column: 5, length: 5, preview: "def greet(name):", previewOffset: 0 }],
        },
      ],
      truncated: false,
    },
    errors: { ...projectAccess, 400: "Type from 2 to 200 characters to search" },
  },
  "GET /projects/{projectId}/export": {
    summary: "Download the project as a ZIP",
    description: "Returns all text files of the project in one archive, with their folders.",
    auth: true,
    success: { status: 200, description: "The ZIP archive", contentType: "application/zip" },
    errors: projectAccess,
  },

  "GET /projects/{projectId}/messages": {
    summary: "Read the chat",
    description:
      "Returns the latest messages, oldest first, up to `limit` (50 by default, 100 at most). To load older ones, pass the id of the oldest message you have as `before`.",
    auth: true,
    response: [message],
    errors: { ...projectAccess, 404: ["Project not found, or you have no access to it", "Message not found"] },
  },
  "POST /projects/{projectId}/messages": {
    summary: "Send a chat message",
    description: "Saves the message and sends it to everyone in the project over the WebSocket (`message.created`). Viewers can write too.",
    auth: true,
    request: { body: "I fixed the loop in main.py, please check line 12" },
    response: message,
    errors: { 404: "Project not found, or you have no access to it" },
  },

  "POST /projects/{projectId}/class": {
    summary: "Turn a project into a class task",
    description:
      "A teacher makes a class from a project. Every student who opens the class link gets their own copy of the task. Calling it again returns the same class.",
    auth: true,
    request: { name: "Python, group 2" },
    response: { ...classroom, studentCount: 0 },
    errors: { ...projectAccess, 400: "A student's copy cannot become a class task" },
  },
  "GET /classes": {
    summary: "List my classes",
    description: "Lists the classes where the current user is the teacher.",
    auth: true,
    response: [classroom],
  },
  "GET /classes/{classId}": {
    summary: "See a class with its students",
    description: "Shows every student's copy, when they last edited it and who is online now.",
    auth: true,
    response: {
      ...classroom,
      students: [
        { projectId: id.studentProject, name: "Boris", isGuest: true, joinedAt: time, lastEditAt: later, online: true },
        { projectId: "7a3c1e9f-2d5b-4f8a-b6e4-0c9d3a7f1b52", name: "Clara", isGuest: false, joinedAt: time, lastEditAt: null, online: false },
      ],
    },
    errors: { 404: "Class not found" },
  },
  "DELETE /classes/{classId}": {
    summary: "Close a class",
    description: "The class link stops working. The task and the students' copies stay.",
    auth: true,
    success: { status: 204, description: "The class is closed" },
    errors: { 404: "Class not found" },
  },
  "POST /classes/{classId}/regenerate-link": {
    summary: "Make a new class link",
    description: "Creates a new join code. The old class link stops working.",
    auth: true,
    response: { ...classroom, joinCode: "N3wCl4ssL1nk" },
    errors: { 404: "Class not found" },
  },
  "GET /class-links/{code}": {
    summary: "See where a class link leads",
    description: "Shows the class and the teacher before a student joins. Works without signing in.",
    auth: false,
    response: { className: "Python, group 2", teacherName: "Anna" },
    errors: { 404: "The class link is not valid or has expired" },
  },
  "POST /class-links/{code}/join": {
    summary: "Join a class",
    description: "Creates the student's own copy of the task, or returns the copy the student already has.",
    auth: true,
    response: { projectId: id.studentProject },
    errors: { 403: "You have reached the limit of 100 projects. Delete an old project to make room.", 404: "The class link is not valid or has expired" },
  },

  "POST /projects/{projectId}/files/{fileId}/run": {
    summary: "Run a code file",
    description:
      "Puts the program in the queue and returns at once with a `runId`. The output comes to everyone in the project over the WebSocket: `run.started`, `run.output` and `run.finished`. Send the current text of the file in `code`; other files of the project are sent along so imports work. JavaScript, Python, C, C++ and Java can run, for up to 10 seconds.",
    auth: true,
    runCode: true,
    request: { code: 'print("Hello, team!")\n' },
    response: { runId: id.run },
    success: { status: 202, description: "The run is in the queue" },
    errors: {
      400: ["Only JavaScript, Python, C, C++ and Java files can run", "Only code files can run"],
      403: ["You do not have the rights for this in the project", "Running code on this site needs an access code. Enter the right code."],
      404: ["Project not found, or you have no access to it", "File not found"],
      429: ["You started too many programs in a minute. Wait 25 s and try again.", "Too many programs are running right now. Please try again in a minute."],
      503: "Running code is not available right now. Please try a bit later.",
    },
  },
  "POST /projects/{projectId}/runs/{runId}/stop": {
    summary: "Stop a running program",
    description: "Any editor can stop a run. Everyone gets `run.finished` with the status `stopped`.",
    auth: true,
    runCode: true,
    response: {},
    success: { status: 202, description: "The stop request is sent" },
    errors: { ...projectAccess, 503: "Could not stop the program. It will stop by itself after 10 seconds." },
  },
  "POST /projects/{projectId}/terminal": {
    summary: "Open a terminal",
    description:
      "Returns a ticket for the terminal WebSocket of the runner (`/terminal?ticket=…`). The ticket works once and for 60 seconds. The terminal runs in a sandbox with the project's files in `/project`.",
    auth: true,
    runCode: true,
    response: { ticket: "t1ck3t-9f2c7a4e1b8d5f3a6c0e" },
    success: { status: 201, description: "The ticket is ready" },
    errors: { 403: ["You do not have the rights for this in the project", "Running code is turned off on this server"], 404: "Project not found, or you have no access to it" },
  },

  "POST /projects/{projectId}/import/github": {
    summary: "Import a public GitHub repository",
    description:
      "Downloads a public repository (optionally a branch or folder from the link) and adds its text files to the project. Files that already exist, binary files and files over 512 KB are skipped and counted. The archive may be up to 25 MB, with up to 500 files.",
    auth: true,
    request: { url: "https://github.com/octo-school/algorithms" },
    response: {
      repo: { ...repo, ref: null },
      imported: 24,
      skipped: { existing: 1, ignored: 3, binary: 2, tooLarge: 0, overLimit: 0 },
      skippedPaths: ["main.py", "logo.png", "data/big.bin"],
    },
    errors: {
      ...projectAccess,
      400: "This does not look like a GitHub repository link. Example: https://github.com/owner/repo",
      404: ["Project not found, or you have no access to it", "Repository or branch not found. Private repositories are not supported yet."],
      413: "The repository is too large (the archive is over 25 MB).",
      422: "Could not read the repository archive.",
      502: "Could not reach GitHub. Please try again.",
    },
  },
  "POST /projects/{projectId}/github/branches": {
    summary: "List the branches of the linked repository",
    description: "Uses the person's GitHub token (it is not saved) to list branches and to check that the token can push.",
    auth: true,
    request: { token: "YOUR_GITHUB_TOKEN", repoUrl: "https://github.com/octo-school/algorithms" },
    response: { repo, defaultBranch: "main", branches: ["main", "homework-3"], canPush: true },
    errors: {
      ...githubErrors,
      400: ["GitHub did not accept the token: it is not valid or has expired.", "The project is not linked to a GitHub repository. Give a link to it."],
      403: "You do not have the rights for this in the project",
    },
  },
  "POST /projects/{projectId}/github/preview": {
    summary: "See what a push would change",
    description:
      "Compares the project with the branch on GitHub. `conflicts` lists files that changed on GitHub after the import; pushing them needs `overwrite: true`.",
    auth: true,
    request: { token: "YOUR_GITHUB_TOKEN", branch: "main" },
    response: { branch: "main", newBranch: false, added: ["utils/sort.py"], modified: ["main.py"], conflicts: [], unchanged: 22 },
    errors: {
      ...githubErrors,
      400: ["GitHub did not accept the token: it is not valid or has expired.", "This branch name is not allowed.", "The project is not linked to a GitHub repository. Give a link to it."],
      403: ["You do not have the rights for this in the project", "The token cannot write to this repository (it needs Contents: write)."],
      413: "The repository is too large to push changes from the browser.",
    },
  },
  "POST /projects/{projectId}/github/push": {
    summary: "Push the project to GitHub",
    description: "Makes one commit with all changed files. A branch that does not exist yet is created.",
    auth: true,
    request: { token: "YOUR_GITHUB_TOKEN", message: "Homework 3: sorting", branch: "main" },
    response: {
      repo,
      branch: "main",
      newBranch: false,
      commitSha: "9fceb02d0ae598e95dc970b74767f19372d61af8",
      commitUrl: "https://github.com/octo-school/algorithms/commit/9fceb02d0ae598e95dc970b74767f19372d61af8",
      added: 1,
      modified: 1,
      unchanged: 22,
    },
    errors: {
      ...githubErrors,
      403: ["You do not have the rights for this in the project", "The token cannot write to this repository (it needs Contents: write)."],
      409: [
        "Nothing to push: the project files match the repository.",
        "These files changed on GitHub after the import: main.py. Pushing would overwrite those changes.",
      ],
      413: "The repository is too large to push changes from the browser.",
    },
  },
  "GET /projects/{projectId}/branches": {
    summary: "List branches of an imported repository",
    description: "For a project imported from GitHub: the active branch, the default one, all branches and the ones already loaded.",
    auth: true,
    response: { repo, active: "main", defaultBranch: "main", branches: ["main", "homework-3"], loaded: ["main"] },
    errors: {
      ...projectAccess,
      400: "The project is not linked to a GitHub repository. Import it first.",
      502: "Could not find the default branch of the repository. Please try later.",
    },
  },
  "POST /projects/{projectId}/branch": {
    summary: "Switch the branch for everyone",
    description:
      "Switches the project to another branch of the imported repository. The first time a branch is loaded from GitHub. Everyone in the project gets `project.branch` and sees the files of the new branch.",
    auth: true,
    request: { name: "homework-3" },
    response: { branch: "homework-3", imported: 26 },
    errors: {
      ...projectAccess,
      400: ["The project is not linked to a GitHub repository. Import it first.", "This branch name is not allowed."],
      404: ["Project not found, or you have no access to it", "Repository or branch not found. Private repositories are not supported yet."],
      413: "The repository is too large (the archive is over 25 MB).",
      422: "Could not read the repository archive.",
      502: "Could not reach GitHub. Please try again.",
    },
  },

  "POST /client-errors": {
    summary: "Report an error from the web app",
    description: "The web app sends errors it could not handle. The API only writes them to its log. Query strings are cut from `url`.",
    auth: false,
    request: { message: "Cannot read properties of undefined (reading 'path')", url: "/projects/b2e7c4d1/files/c9a4f2e7", release: "production" },
    success: { status: 204, description: "The report is logged" },
  },
};
