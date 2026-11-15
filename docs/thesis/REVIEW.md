# Review of the explanatory note

A working document for the author; it is not part of the explanatory note. The review was done on
5 October 2026. The changes were split into three commits: facts, language, and formatting with the list
of sources.

## 1. How it was checked

- **The tests were run, not only counted.** Infrastructure:
  `docker compose -f infra/docker-compose.dev.yml up -d`, database `collab_test`,
  `pnpm install --frozen-lockfile`, `prisma migrate deploy` (5 migrations, the schema is up to date).
  Results (all passed):

  | Package | Tests in the text | Actually passed |
  |---|---|---|
  | `apps/api` | 126 | 126 |
  | `infra/local-host` | 9 | 9 |
  | `apps/collab` | 5 | 5 |
  | `apps/runner` (real Docker) | 46 | 46 |
  | `apps/web` | 57 | 57 |
  | `bench` | 10 | 10 (5 tests × 2 systems) |
  | `e2e` (Playwright, `E2E_RUNNER=1`, runner started) | 22 | 22 passed, 1 skipped (`screenshots.spec.ts`, as intended) |
  | **Total** | **275** | **275** |

  The E2E run took 3.4 min (the text said "about 70 seconds"; fixed).
- **The numbers of chapter 4** were checked against `bench/results/latest.json` and `REPORT.md` (138 runs:
  72 + 18 + 36 + 12; 23,498 edits in the typing runs; maximum event loop lag 32.03 ms; all runs converged,
  delivery share 1.0). Mean CPU and RSS were recalculated over the repeats from the JSON.
- **Sandbox limits, endpoints, ports, events, import limits** were checked against the code
  (`apps/runner/src/sandbox.ts`, `terminal/session.ts`, `packages/shared/src/**`, `apps/api/src/app.ts`,
  `*.routes.ts`, `apps/collab/src/server.ts`, `packages/db/prisma/schema.prisma`,
  `infra/docker-compose.yml`, `infra/docker/Dockerfile`).
- **The PWA build** was run (`vite build`): precache of 110 files, 13,828 KiB.
- **Sources** were checked through ACM DL / Springer / dblp / arXiv (authors, year, pages, DOI);
  documentation sites were opened on 5 October 2026.

## 2. What was changed

### Chapter 1
- [x] Caption and in-text reference for table 1.1.
- [x] References `[1]`–`[10]` placed in the order of first mention.
- [x] Made precise: `clock` in Yjs counts the elements inserted by a client, not "operations".
- [x] The example in section 1.3: "a remote edit" (ambiguous) → "another participant's edit".
- [x] Terms: CvRDT/CmRDT got plain names; one term for tombstones in all chapters; the sentence about TP2
      was fixed; "scratch pad" was removed.
- [x] The "Sources for the chapter" section moved to a separate element, `07-references.md`.

### Chapter 2
- [x] **Contradiction:** "What is not done" listed the terminal and Git integration, although both are
      built (sections 3.6, 3.8). The wording became "a full Git client…", and item 8 about helper
      features was added to the functional requirements (please check that you agree).
- [x] "Four server processes" → "a client app, three server services and two stores"; the terminal server
      is named for `runner`.
- [x] ADR-003 referred to "section 3.5"; the limits are described in section 3.6.
- [x] The data model table got the columns added later (`github_*`, `branch`, `source_sha`, `deleted_at`,
      `trashed_path`, `created_at` in `refresh_tokens`); what the ER diagram leaves out is explained.
- [x] A guest is created not "without email and password" but with a technical address
      `guest-…@guest.local` and a random password; the wording was made precise (also in 3.2, 5.4).
- [x] Subheadings numbered 2.1.1–2.1.4, 2.3.1; captions for tables 2.1–2.3 and figures 2.1–2.14
      (including 10 screenshots), with references in the text.
- [x] Style: consistent terms for hash, client app, queue worker, participant/user, and screen widths.

### Chapter 3
- [x] "The auth hook signs the JWT" → "checks the JWT signature".
- [x] The snapshot save delay made concrete: 1 s after an edit, at least every 3 s
      (`debounce`/`maxDebounce` in `apps/collab/src/server.ts`).
- [x] `docker-compose.yml`: migrations are a separate `migrate` job in the `tools` profile.
- [x] Caption for table 3.1; reference `[10]` for Hocuspocus.
- [x] Style: several slang words replaced with neutral ones.

### Chapter 4
- [x] Bots run in separate processes only in the typing scenario (in the others the clients live in the
      main process); at N = 100 there are 12–13 clients per process.
- [x] The board scenario lasts 8 s (from `bench/src/run.ts`).
- [x] "p95 up to 10 ms up to 50 users" → "at most 10.3 ms" (Yjs at N = 50 has p95 = 10.3 and 10.1 ms).
- [x] "All values are an order of magnitude below the 100 ms threshold" is true only up to N = 50; at
      N = 100 (p95 28.7 ms) they are 3–4 times below it. Fixed.
- [x] CPU "does not exceed 1%" → "1.5%" (the mean at N = 50 is 1.2–1.4%).
- [x] RSS difference "about 10 MB" → "10–17 MB".
- [x] Traffic in the "same position" mode is 2.4–3.3 times (added); traffic during the merge "3–5 times" →
      "2.9–4.6 times".
- [x] Table 4.4: "2 times more compact" → "2.2–2.3 times" (as in section 4.3.5).
- [x] Token length "8–12 characters" → "8–10" (`<c000.0>` … `<c000.999>`).
- [x] Captions for tables 4.1–4.4 and figures 4.1–4.8, with references; "in 4.2" → "in section 4.2".
- [x] Style: several anglicisms and slang words replaced.

### Chapter 5
- [x] The description of the `apps/web` tests was completed (it listed 4 topics out of 10 files).
- [x] E2E run time: "about 70 seconds" → "about 3.5 minutes".
- [x] Precache: "about 13 MB" → "110 files, about 13.5 MB".
- [x] The list of scenarios in 5.2 made continuous; "scenario 9 extended with the trash" moved into item 9
      itself. The reference "section 5.2, scenario 2" is correct.
- [x] Captions for tables 5.1–5.3. Style: slang for smoke tests, mocks, failures, timeouts, deployment and
      screenshots replaced.

### Conclusion
- [x] The same corrected numbers (10.3 ms; 10–17 MB; 2.2–2.3 times).
- [x] **Meaning error:** "far beyond the noticeable threshold" would mean "above the threshold"; replaced
      with "well below the noticeable threshold (about 100 ms)".
- [x] The terminal is mentioned; slang words were replaced.

### List of sources (`07-references.md`)
- [x] Formatted to one style: authors, title, venue, pages, DOI; web resources with the URL and the access
      date (5 October 2026).
- [x] Numbered in the order of first mention; every source is cited in the text, and every citation in the
      text is in the list (10 of 10).
- [x] The item "Documentation of Yjs, Hocuspocus, ShareDB" was split into separate entries with URLs; the
      documentation of the `json0` type was added (the description of the `si`/`sd`/`oi`/`od` operations
      relies on it).

## 3. Checking the sources

| No. | Source | Result |
|---|---|---|
| 1 | Sun, Ellis. CSCW '98, pp. 59–68 | Exists, data correct; DOI 10.1145/289444.289469 |
| 2 | Ellis, Gibbs. SIGMOD '89, pp. 399–407 | Exists, data correct. Published in the SIGMOD '89 proceedings (also SIGMOD Record, vol. 18, no. 2); proceedings DOI 10.1145/67544.66963 |
| 5 | Shapiro, Preguiça, Baquero, Zawirski. SSS 2011, LNCS 6976, pp. 386–400 | Exists, data correct; DOI 10.1007/978-3-642-24550-3_29 |
| 6 | Nicolaescu, Jahns, Derntl, Klamma. GROUP '16, pp. 39–49 | Exists, data correct; DOI 10.1145/2957276.2957310 |
| 7 | Lamport. CACM 21(7), pp. 558–565, 1978 | Exists, data correct; DOI 10.1145/359545.359563 |
| 9 | Kleppmann, Beresford. IEEE TPDS 28(10), pp. 2733–2746, 2017 | Exists, data correct; DOI 10.1109/TPDS.2017.2697382 |
| 3, 4, 8, 10 | Documentation of ShareDB, json0, Yjs, Hocuspocus | Pages available on 5 October 2026. Hocuspocus moved to tiptap.dev; the current address is given |

No invented or distorted sources were found. The earlier note "written from memory" was removed: all data
is confirmed.

**Sources worth adding** (some claims in the text have no reference). Check the data before adding; the
details below were not checked against the originals:
- the CCI model in section 1.3: the original source is Sun C., Jia X., Zhang Y., Yang Y., Chen D.
  "Achieving convergence, causality preservation, and intention preservation in real-time cooperative
  editing systems", ACM TOCHI, 1998, vol. 5, no. 1 (now the text refers to [1], which also discusses the
  model);
- the claim that many transformation functions do not satisfy TP2 (section 1.4): for example, the work of
  A. Imine and co-authors (ECSCW 2003);
- the WOOT, Logoot and RGA algorithms (section 1.5.1): the original papers (Oster et al., 2006; Weiss,
  Urso, Molli, 2009; Roh et al., 2011);
- Google Docs on OT and Figma with per-property LWW registers (section 1.2): public technical posts on the
  Google Drive blog (2010) and the Figma blog (2019);
- the comparison with VS Code Live Share, Replit and CodeSandbox (table 1.1): the official product
  documentation (the text says "the assessment is based on public documentation" but gives no
  references).

## 4. What could not be checked or is doubtful

- **Table 1.1** (Live Share, Replit, CodeSandbox): no sources; claims like "Own server: No" and "Joining
  without an account" should be checked against current documentation.
- **Bench duration** "≈ 30 minutes" / "≈ 2 minutes" (section 4.6): the full bench was not re-run.
- **Trial runs at 2 edits/s** (section 4.3.7): the data was not saved (the text says so too), so it cannot
  be checked.
- **History of the flaky chat test** (section 5.2: 20 single runs, 4 full runs, 24 repeats in 6 workers):
  no traces in the repository; in this run the test passed.
- **Past bugs** from sections 3.12 and 5.6 (Content-Type on empty requests, Prisma generation for the
  runner): described plausibly and consistent with the current code, but they cannot be checked as
  history.
- **Building the Docker images** (section 5.6) was not repeated during the review.
- **Accessibility** (section 2.5: `aria-label`, Escape, focus outline) was checked only selectively in the
  code.
- **The diagrams are out of date:** `architecture.*` does not show the terminal server in `runner` or the
  GitHub link; `er.*` does not show the columns added in migrations 3–5 (the text says so, but redrawing is
  better). The sources are SVG files in `diagrams/`; the PNGs are rebuilt with
  `pnpm --filter @collab/e2e exec node tools/render-diagrams.mjs`.
- **Library versions are hardly given in the text.** If the department requires it, add a table. The
  versions installed according to `pnpm-lock.yaml`: Node.js 22, TypeScript 5.9.3, Yjs 13.6.33,
  Hocuspocus 2.15.3, ShareDB 5.2.2, ot-json0 1.1.0, Fastify 5.12.5, React 18.3.1, Monaco 0.52.2,
  react-konva 18.2.16, @xterm/xterm 6.0.0, Prisma 5.22.0, BullMQ 5.81.5, Zod 3.25.76, Tailwind CSS
  3.4.19, vite-plugin-pwa 0.20.5, Vitest 2.1.9, Playwright 1.63.0, PostgreSQL 16, Redis 7.

## 5. What to do by hand in Word

- [ ] Title page, thesis assignment, schedule (on the department's forms).
- [ ] **Abstract**: size, number of figures (22), tables (12), sources (10), keywords (5–15 words in
      capitals), the abstract text.
- [ ] **Table of contents** (automatic).
- [ ] **There is no introduction.** It is a required part: relevance, goal, tasks, object and subject,
      methods, practical value. The goal is now stated in section 1.1 and can be moved there.
- [ ] A list of abbreviations (CRDT, OT, CCI, TP1/TP2, LWW, CvRDT/CmRDT, SEC, JWT, PWA, SPA, ADR, RSS, CPU,
      SSRF, TTY, E2E and so on), since there are more than five terms.
- [ ] Appendices (optional): ADRs, the WebSocket protocol description, code fragments, the full tables from
      `REPORT.md`. The code block in section 4.6 is better moved to an appendix.
- [ ] Margins, font, line spacing, indents and alignment as the department requires.
- [ ] Page numbers at the bottom centre; the title page is counted but not numbered.
- [ ] Each chapter starts on a new page; "INTRODUCTION", "CONCLUSION", "REFERENCES", "APPENDIX A" in
      capitals, centred, without a number. No full stop at the end of headings (already removed in
      Markdown).
- [ ] Captions: "Table X.Y. …" above the table on the left; "Figure X.Y. …" under the figure, centred. Long
      tables continued on the next page get "Table X.Y (continued)".
- [ ] The chapter 4 figures are included as SVG through relative paths (`../../bench/results/charts/*.svg`);
      for Word, export them to PNG/EMF and check that the axis labels are readable.
- [ ] Lists: dashes for simple lists, and "a)", "b)" or "1)", "2)" for nested or numbered ones (Markdown
      uses "1.").
- [ ] The TP1 condition and the merge properties (sections 1.4, 1.5) can be set as numbered formulas (1),
      (2)…
- [ ] Typography: a non-breaking space before "%" and units, one style of thousands separator, one dash
      style in the list of sources.
- [ ] Before submitting, update the access dates of the web resources [3], [4], [8], [10].

## 6. Questions for the author and the supervisor

1. Is a separate "Introduction" section in the department's format needed? Should the goal from section
   1.1 move there?
2. Table 2.1 ("Complexity criteria"): are the criterion names (Back-end, Adaptive UI, Cloud…) taken from the
   department's requirements?
3. Does the "Cloud: AWS" criterion count if the AWS deployment is described but not done (section 5.5,
   Conclusion)?
4. Do you agree with the added item 8 of the functional requirements (terminal, GitHub, branches), or should
   these features be marked as going beyond the original plan?
5. Are subheadings inside the "Conclusion" ("What was done", "Limitations"…) allowed? Many departments
   require continuous text.
6. Are "Conclusions of the chapter" needed in chapters 2–5 (now only chapter 1 has them)?
7. Is the Discord analogy (sections 2.3, 2.5) suitable for an academic text, or should it be replaced with
   a neutral description?
8. Sections on economics and occupational safety: still an open question.
9. If the defence is on another machine, re-run the bench and update chapter 4 and this review.
