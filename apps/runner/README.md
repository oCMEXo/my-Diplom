# @collab/runner

A BullMQ worker (ADR-003): it takes code run jobs from the queue and runs them in a one-off Docker
container (`node:22-alpine` / `python:3.12-alpine`) without network, with a read-only file system, an
unprivileged user and limits on CPU, memory, processes and time. The output is published to Redis, and
the API sends it to the project members over WebSocket. It also serves the terminal.

Details and the limit values are in
[ADR-003](../../docs/adr/003-code-execution-docker-queue.md).

## Local development

You need Docker and Redis (`infra/docker-compose.dev.yml`).

```bash
docker pull node:22-alpine && docker pull python:3.12-alpine
cp .env.example .env
pnpm --filter @collab/runner dev
```

The sandbox integration tests (`executor.test.ts`) start real containers and are skipped automatically
if Docker or the images are not available.
