# Test hosting on your own computer

This is for showing the site to other people (the supervisor, friends, the committee) without a cloud:
it runs on your computer, and a free Cloudflare tunnel gives access from outside.

## Starting it

You need Docker Desktop running with the development containers
(`docker compose -f infra/docker-compose.dev.yml up -d`) and `pnpm install`.

```bash
pnpm host:test                  # build, start, open a public address
pnpm host:test -- --no-tunnel   # only http://127.0.0.1:8787, no tunnel
pnpm host:test -- --skip-build  # don't rebuild the site if the code did not change
pnpm host:test -- --port=8800   # another port
pnpm host:test -- --no-run      # no running code and no terminal at all
```

At the end the window shows an address like `https://something.trycloudflare.com` that you can send to
people. **The address changes on every start.** Stop the hosting with Ctrl+C. While the computer sleeps,
is off, or the window is closed, the site is not available. The last address is also written to
`infra/local-host/.state/public-url.txt`.

On the first start `cloudflared` (about 30 MB, from Cloudflare's official releases on GitHub) is
downloaded to `infra/local-host/bin/`. It is not committed to Git.

## What starts

| Part | Where | Why |
|---|---|---|
| Database `collab_host` | in the development Postgres container | apart from the development data |
| API | `127.0.0.1:9787` | REST and the event WebSocket |
| Sync server | `127.0.0.1:10787` | editing together |
| Runner (sandbox) | queue in Redis database 2, terminals on `127.0.0.1:11787` | running code and the terminal |
| Web app + proxy | `127.0.0.1:8787` | the site, `/api`, `/collab` and `/terminal` on one address |
| Cloudflare tunnel | outside → `127.0.0.1:8787` | public address |

The API and the sync server listen only on `127.0.0.1` and cannot be reached from outside: all traffic
goes through one proxy.

## What is turned on for security

A public address opens your machine to everyone who has the link, so:

- **Running code and the terminal need an access code.** On the first start a code like
  `K7PX-M2QD-9WRT` is created; it is printed in the hosting window and kept in
  `infra/local-host/.state/secrets.json` (the `runCode` field; delete it to get a new code). Visitors
  without the code can edit and chat, but the Run button and the terminal ask for the code, and the
  server answers `403` to requests without it. Guessing the code is limited to 20 tries a minute. If
  Redis or Docker does not answer (or `--no-run` is given), running code and the terminal are turned off
  completely.
- **Sandbox**: programs and the terminal run in containers without network, with a read-only system, as
  the user `nobody`, with memory and time limits (the terminal gets 256 MB and up to 30 minutes). Code is
  run with the access code by you or by the people you told it to.
- **Rate limits**: 600 requests a minute per address, and 20 a minute for sign-in, sign-up and guest
  entry (otherwise anyone could overload the server with password hashing and new guests).
- **Secrets** (token signing keys) are created on the first start and kept in
  `infra/local-host/.state/secrets.json`; they are not committed to Git.
- The test site's data is in a separate database, which can be dropped
  (`docker exec collab-dev-postgres-1 psql -U collab -d postgres -c "DROP DATABASE collab_host"`)
  without touching development.

## Good to know

- Sign-up is open to everyone who has the address. Don't post the address where you don't want extra
  guests, and don't keep anything secret on the test site.
- The tunnel is a "quick" one (no account): Cloudflare gives no uptime guarantees for it. For a permanent
  address you need your own domain and a named tunnel, or a deployment like the one in
  [deploy-gcp.md](deploy-gcp.md).
- Pushing to GitHub and importing work (the computer has internet), but users type their GitHub token
  on a public site: test with a token you don't mind revoking.
- Logs of each part: `infra/local-host/.state/logs/`.
