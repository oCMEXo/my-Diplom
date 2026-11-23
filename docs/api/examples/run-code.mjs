const API = process.env.API_URL ?? "http://localhost:3001";
const RUN_CODE = process.env.RUN_CODE;

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(RUN_CODE ? { "X-Run-Code": RUN_CODE } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${method} ${path} failed with ${response.status}: ${data?.message}`);
  return data;
}

const features = await call("GET", "/features");
if (features.run === "off") throw new Error("Running code is turned off on this server");
if (features.run === "code" && !RUN_CODE) throw new Error("This server needs an access code: set RUN_CODE");

const { tokens } = await call("POST", "/auth/guest", { body: { name: "Script" } });
const token = tokens.accessToken;

const project = await call("POST", "/projects", { token, body: { name: "Run from a script" } });
const file = await call("POST", `/projects/${project.id}/files`, { token, body: { path: "hello.py", type: "code" } });

const socketUrl = `${API.replace(/^http/, "ws")}/ws?projectId=${project.id}&token=${encodeURIComponent(token)}`;
const socket = new WebSocket(socketUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", () => reject(new Error("Could not open the WebSocket")), { once: true });
});
console.log("WebSocket is open");

const finished = new Promise((resolve) => {
  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "run.started") console.log(`run.started by ${data.startedBy.name} (${data.language})`);
    if (data.type === "run.output") process.stdout.write(`[${data.stream}] ${data.chunk}`);
    if (data.type === "run.finished") resolve(data);
  });
});

const code = 'for i in range(3):\n    print("Hello from the sandbox", i)\n';
const { runId } = await call("POST", `/projects/${project.id}/files/${file.id}/run`, { token, body: { code } });
console.log("Run accepted:", runId);

const result = await finished;
console.log(`run.finished: status=${result.status}, exit code=${result.exitCode}, ${result.durationMs} ms`);

socket.close();
await call("DELETE", `/projects/${project.id}`, { token });
