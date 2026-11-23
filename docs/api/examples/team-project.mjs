const API = process.env.API_URL ?? "http://localhost:3001";

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

const anna = await call("POST", "/auth/guest", { body: { name: "Anna" } });
const annaToken = anna.tokens.accessToken;
console.log("1. Anna is signed in as", anna.user.name);

const project = await call("POST", "/projects", { token: annaToken, body: { name: "Algorithms homework" } });
console.log("2. Project created:", project.id);

const file = await call("POST", `/projects/${project.id}/files`, {
  token: annaToken,
  body: { path: "src/sort.py", type: "code" },
});
console.log("3. File created:", file.path, `(${file.language})`);

const invite = await call("PATCH", `/projects/${project.id}/invite`, { token: annaToken, body: { role: "editor" } });
console.log("4. Invite code:", invite.inviteCode, "gives the role", invite.inviteRole);

const preview = await call("GET", `/join/${invite.inviteCode}`);
console.log("5. The link leads to", `"${preview.projectName}"`, "by", preview.ownerName);

const boris = await call("POST", "/auth/guest", { body: { name: "Boris" } });
const borisToken = boris.tokens.accessToken;
await call("POST", `/join/${invite.inviteCode}`, { token: borisToken });
console.log("6. Boris joined the project");

await call("POST", `/projects/${project.id}/messages`, {
  token: borisToken,
  body: { body: "Hi! I will write the merge sort." },
});
const messages = await call("GET", `/projects/${project.id}/messages`, { token: annaToken });
console.log("7. Anna reads the chat:", messages.map((m) => `${m.author.name}: ${m.body}`).join(" | "));

const details = await call("GET", `/projects/${project.id}`, { token: annaToken });
console.log("8. Members:", details.members.map((m) => `${m.name} (${m.role})`).join(", "));

const borisId = boris.user.id;
await call("PATCH", `/projects/${project.id}/members/${borisId}`, { token: annaToken, body: { role: "viewer" } });
try {
  await call("POST", `/projects/${project.id}/files`, { token: borisToken, body: { path: "notes.md", type: "doc" } });
} catch (error) {
  console.log("9. Boris is a viewer now. Creating a file fails:", error.message);
}

await call("DELETE", `/projects/${project.id}`, { token: annaToken });
console.log("10. Project deleted");
