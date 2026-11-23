# From diploma project to product

The product works. What is missing is proof that people need it and would pay for it, so the plan starts
with people and puts code second. The chosen niche is **teaching**: tutors, university labs and bootcamps,
where "a student joins the lesson by a link, without an account" is the strong side.

## Done in the code

| Plan item | What was built | Where |
|---|---|---|
| Safe for strangers: sandbox | gVisor can run every program and terminal (`SANDBOX_RUNTIME=runsc`); one script turns it on | `apps/runner/src/sandbox.ts`, `infra/gcp/enable-gvisor.sh` |
| Safe for strangers: accounts | Email confirmation and password reset by email (SMTP), "Continue with GitHub" | `apps/api/src/modules/auth/email.service.ts`, `github-signin.service.ts` |
| Safe for strangers: limits | Projects per person, files per project, runs and terminals per minute | `apps/api/src/lib/limits.ts` |
| Safe for strangers: operations | Daily database backups kept 7 days, `/health/ready` for an uptime monitor, browser errors in the server log | `infra/backup.sh`, `apps/api/src/lib/health.ts` |
| Built for teachers: classes | One class link, every student gets their own copy of the task, the class page lists students with their last edit and who is online | `apps/api/src/modules/classes`, `apps/web/src/pages/ClassPage.tsx` |
| Built for teachers: languages | C, C++ and Java run next to JavaScript and Python | `apps/runner/src/sandbox.ts` |
| Measure | Usage events on our own server (no cookies, no third parties, deleted after 180 days) and a `stats` command | `apps/api/src/lib/usage.ts`, `apps/api/src/stats.ts` |
| First users | A landing page for visitors with "Try it now as a guest" | `apps/web/src/pages/LandingPage.tsx` |

All of it is covered by tests: unit tests with a real database and Redis, real Docker runs of C, C++
and Java, and end-to-end tests of the class, password and landing flows.

## Left for the owner (cannot be done in code)

1. **Check that the problem is real.** Run the survey and the pilot from `docs/ba/survey.md`: 15–30 answers
   and 5 pairs. Talk to 10 teachers or tutors about how they teach code online now.
2. **Name and domain.** "Collab" is too common to protect or find. Choose a name, buy a domain, point it at
   the server, and set `CORS_ORIGIN`/`APP_URL` to it.
3. **Accounts for services.** An SMTP service for email (`SMTP_URL`), a GitHub OAuth app
   (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`), and an uptime monitor pointed at `/health/ready`.
4. **Turn on gVisor** on the server before inviting strangers: `infra/gcp/enable-gvisor.sh`.
5. **Off-site backups.** The daily backups live on the server's disk; add disk snapshots in Google Cloud or
   copy the dumps to a storage bucket.
6. **First users.** A 2-minute demo video, an article from the CRDT vs OT study, and free use by 3–5 real
   classes in exchange for feedback.
7. **Legal.** Check the university's rules on who owns a diploma project. Schools will ask for a data
   processing agreement, and students can be under 18: let a lawyer review the terms and the privacy page.
8. **Money and company**, only once someone is ready to pay: free for students, a paid plan for teachers and
   schools (bigger classes, more run time, private projects), a payment service that handles taxes, and a
   co-founder who can sell.

## Next in the code, after feedback

- Private GitHub repositories (needs the GitHub token to be stored encrypted).
- A grid view of all students' code at once on the class page, and deadlines for tasks.
- More languages, and more run time for paid plans.
- Several API instances behind a load balancer (events through Redis pub/sub).
