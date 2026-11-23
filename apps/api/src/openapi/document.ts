import { createJsonSchemaTransformObject } from "fastify-type-provider-zod";
import { RUN_CODE_HEADER } from "@collab/shared";
import { componentSchemas } from "./components.js";
import { operations, type OperationDoc } from "./operations.js";

type Json = Record<string, any>;

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

const VALIDATION_MESSAGE = "Please check the form: some fields are not valid.";

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No content",
  302: "Redirect",
  400: "The request is not valid",
  401: "Not signed in, or the token has expired",
  403: "Not allowed",
  404: "Not found",
  409: "Conflict with the current state",
  413: "Too large",
  422: "Could not be processed",
  429: "Too many requests",
  500: "Server error",
  502: "An outside service failed",
  503: "Temporarily not available",
};

export const apiDescription = `REST API of Collab, a web app where several people write code, documents and boards together in real time.

This API covers accounts, projects, members, files, versions, chat, classes, code runs and GitHub. The text of files is not sent through REST: it syncs over a WebSocket with the collaboration server (Yjs). Live events (presence, chat, run output, access changes) come over \`GET /ws\`. Both are described in [docs/websocket-protocol.md](https://github.com/oCMEXo/my-Diplom/blob/main/docs/websocket-protocol.md).

**Guides:** [Getting started](https://github.com/oCMEXo/my-Diplom/blob/main/docs/api/getting-started.md) · [Integration guides](https://github.com/oCMEXo/my-Diplom/blob/main/docs/api/README.md)

## Authentication

Sign in with \`POST /auth/login\`, \`POST /auth/register\` or \`POST /auth/guest\`. Send the access token in every request that needs it:

\`\`\`
Authorization: Bearer <accessToken>
\`\`\`

The access token lives 15 minutes. When a request returns 401, call \`POST /auth/refresh\` with the refresh token (it lives 30 days and works once) and repeat the request.

## Errors

Every error has the same body: \`{ "message": "…" }\`. The message is written for people and can be shown as it is. Invalid input returns 400 with "${VALIDATION_MESSAGE}"

## Limits

Requests per IP are limited (429 with "Too many requests. Wait N s and try again."). Sign-in and sign-up have a stricter limit. A user can own up to 100 projects, and a project can have up to 2000 files.

## Running code

Running code may be turned off or need an access code. \`GET /features\` tells which. With an access code, send it in the \`X-Run-Code\` header.`;

const tags = [
  { name: "auth", description: "Accounts, sign-in, tokens, e-mail confirmation and password reset" },
  { name: "projects", description: "Projects, members and invite links" },
  { name: "files", description: "Files, trash, versions, search and export" },
  { name: "chat", description: "Project chat" },
  { name: "classes", description: "Classes: a teacher gives a task, every student gets an own copy" },
  { name: "runs", description: "Running code and the terminal" },
  { name: "import", description: "Import from GitHub" },
  { name: "github", description: "Push to GitHub and switch branches" },
  { name: "health", description: "Health checks and error reports" },
];

const errorRef = { $ref: "#/components/schemas/Error" };

const sharedResponses = {
  Unauthorized: {
    description: STATUS_TEXT[401],
    content: {
      "application/json": {
        schema: errorRef,
        examples: {
          missing: { summary: "No token", value: { message: "Missing bearer token" } },
          expired: { summary: "Expired or wrong token", value: { message: "Invalid or expired token" } },
        },
      },
    },
  },
  TooManyRequests: {
    description: STATUS_TEXT[429],
    content: { "application/json": { schema: errorRef, example: { message: "Too many requests. Wait 42 s and try again." } } },
  },
  ServerError: {
    description: STATUS_TEXT[500],
    content: { "application/json": { schema: errorRef, example: { message: "Server error. Please try again." } } },
  },
};

export function operationKey(method: string, path: string) {
  return `${method.toUpperCase()} ${path}`;
}

function operationId(method: string, path: string) {
  const words = path
    .split("/")
    .filter(Boolean)
    .map((part) => (part.startsWith("{") ? `by-${part.slice(1, -1)}` : part))
    .flatMap((part) => part.split("-"));
  return [method, ...words].map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1))).join("");
}

function messagesOf(value: string | string[]) {
  return Array.isArray(value) ? value : [value];
}

function errorContent(messages: string[]) {
  if (messages.length === 1) return { "application/json": { schema: errorRef, example: { message: messages[0] } } };
  const examples: Json = {};
  messages.forEach((message, index) => {
    examples[`case${index + 1}`] = { summary: message.length > 60 ? `${message.slice(0, 57)}…` : message, value: { message } };
  });
  return { "application/json": { schema: errorRef, examples } };
}

function hasInput(operation: Json) {
  return Boolean(operation.requestBody) || (operation.parameters ?? []).length > 0;
}

function applyDoc(method: string, path: string, operation: Json, doc: OperationDoc) {
  operation.summary = doc.summary;
  operation.description = doc.description;
  operation.operationId = operationId(method, path);
  operation.security = doc.auth ? [{ bearerAuth: [] }] : [];

  if (doc.runCode) {
    operation.parameters = [
      ...(operation.parameters ?? []),
      {
        in: "header",
        name: RUN_CODE_HEADER,
        required: false,
        description: "The run access code, when the server needs one (see `GET /features`)",
        schema: { type: "string" },
      },
    ];
  }

  if (operation.requestBody && doc.request !== undefined) {
    operation.requestBody.content["application/json"].example = doc.request;
  }

  const responses: Json = {};
  const declared: Json = operation.responses ?? {};
  const successCode = doc.success?.status ?? Number(Object.keys(declared).find((code) => code.startsWith("2")) ?? 200);
  const success: Json = { description: doc.success?.description ?? STATUS_TEXT[successCode] ?? "OK" };
  if (doc.success?.headers) {
    success.headers = Object.fromEntries(
      Object.entries(doc.success.headers).map(([name, example]) => [name, { schema: { type: "string" }, example }]),
    );
  }
  if (doc.success?.contentType) {
    success.content = { [doc.success.contentType]: { schema: { type: "string", format: "binary" } } };
  } else if (doc.response !== undefined) {
    const schema = declared[String(successCode)]?.content?.["application/json"]?.schema ?? declared["200"]?.content?.["application/json"]?.schema;
    success.content = { "application/json": { schema, example: doc.response } };
  }
  responses[String(successCode)] = success;

  const errors: Record<number, string[]> = {};
  for (const [code, value] of Object.entries(doc.errors ?? {})) errors[Number(code)] = messagesOf(value);
  if (hasInput(operation)) errors[400] = [VALIDATION_MESSAGE, ...(errors[400] ?? [])];

  if (doc.auth) responses["401"] = { $ref: "#/components/responses/Unauthorized" };
  for (const code of Object.keys(errors).map(Number).sort((a, b) => a - b)) {
    if (code === 429) continue;
    responses[String(code)] = { description: STATUS_TEXT[code] ?? "Error", content: errorContent(errors[code]) };
  }
  responses["429"] = errors[429]
    ? { description: STATUS_TEXT[429], content: errorContent(["Too many requests. Wait 42 s and try again.", ...errors[429]]) }
    : { $ref: "#/components/responses/TooManyRequests" };
  responses["500"] = { $ref: "#/components/responses/ServerError" };
  for (const [code, declaredResponse] of Object.entries<Json>(declared)) {
    if (responses[code]) continue;
    const content = declaredResponse.content?.["application/json"];
    const example = doc.alsoReturns?.[Number(code)];
    responses[code] = {
      description: STATUS_TEXT[Number(code)] ?? "Response",
      ...(content ? { content: { "application/json": { schema: content.schema, ...(example === undefined ? {} : { example }) } } } : {}),
    };
  }
  operation.responses = Object.fromEntries(Object.entries(responses).sort(([a], [b]) => Number(a) - Number(b)));
}

function fixNullableRefs(value: unknown, schemas: Json): unknown {
  if (Array.isArray(value)) return value.map((item) => fixNullableRefs(item, schemas));
  if (!value || typeof value !== "object") return value;
  const node = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, fixNullableRefs(child, schemas)])) as Json;
  if (node.nullable === true && !node.type && Array.isArray(node.anyOf) && node.anyOf.length === 1 && node.anyOf[0].$ref) {
    const name = String(node.anyOf[0].$ref).split("/").pop()!;
    return { ...schemas[name], nullable: true };
  }
  return node;
}

export function enrichDocument(document: Json, docs: Record<string, OperationDoc> = operations): Json {
  const paths: Json = {};
  for (const [rawPath, item] of Object.entries<Json>(document.paths ?? {})) {
    const path = rawPath.length > 1 ? rawPath.replace(/\/$/, "") : rawPath;
    for (const method of METHODS) {
      const operation = item[method];
      if (!operation) continue;
      const doc = docs[operationKey(method, path)];
      if (doc) applyDoc(method, path, operation, doc);
    }
    paths[path] = item;
  }
  const result = {
    ...document,
    info: {
      title: "Collab API",
      version: document.info?.version ?? "1.0.0",
      description: apiDescription,
      contact: { name: "Artsiom Harminovich", url: "https://github.com/oCMEXo/my-Diplom" },
    },
    servers: [
      { url: "http://localhost:3001", description: "Local development" },
      { url: "https://35-228-155-63.sslip.io/api", description: "Live demo" },
    ],
    tags,
    paths,
    components: { ...document.components, responses: sharedResponses },
  };
  return fixNullableRefs(result, result.components.schemas ?? {}) as Json;
}

const withComponents = createJsonSchemaTransformObject({ schemas: componentSchemas });

export function transformObject(input: Parameters<typeof withComponents>[0]) {
  return enrichDocument(withComponents(input));
}
