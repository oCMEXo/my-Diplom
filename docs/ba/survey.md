# Survey and interviews for the business analysis

Goal: check the problem hypothesis and get **first values for the KPIs** of section 2.1. The rule for
reading the answers is in section 2.10 of the BA. Each question says what it is needed for. The form is
easy to build in Google Forms ("Blank form" → add the questions one by one; the answer type is in
brackets).

Who to send it to: classmates and IT students, developers I know (15–30 answers are enough). The survey
has not been run yet, and the BA says so directly: the starting KPI values are estimated with the KLM
model and the process model, and the problem is called a hypothesis. The answers would test it.

The form itself is prepared in Russian, for Russian-speaking students. This file is its English version.

---

## Questionnaire (Google Forms)

**Form title:** Working on code together in study and team projects

**Form description (paste as it is):**
> A survey for a diploma project about a platform for editing code together. It takes 3–4 minutes.
> The answers are anonymous: no names or emails are collected. Summary results (percentages, medians)
> will be used in the diploma. Taking part is voluntary, and you can stop at any time.

0. **Consent** (required, checkbox):
   "I agree that my anonymous answers may be used in summary form in the diploma."
   → *legal part, 2.8 (GDPR, participants' consent).*

1. **Who are you?** (one answer): IT student / student of another field / developer (working) /
   teacher / other
   → *2.2 stakeholders, personas.*

2. **How often do you work on code or a study project together with other people?**
   (one answer): never this term / once a month / once a week / several times a week / every day
   → *relevance of the problem (Introduction).*

3. **Which tools do you use for this kind of work?** (several answers):
   Discord / Telegram / Zoom, Google Meet or Teams with screen sharing / GitHub or GitLab /
   Google Docs / VS Code Live Share / Replit / CodeSandbox / Miro, FigJam or another online board /
   I send files in a messenger / other
   → *1.1 AS-IS, 1.3 analogues.*

4. **How many different programs and sites do you usually have open during one session together?**
   (one answer): 1 / 2 / 3 / 4 / 5 or more
   → *KPI "number of tools per session" (baseline).*

5. **How long does it usually take to start working with another person on the same code**
   (invite them, give access, download or sync the project, run it)?
   (one answer): under 1 minute / 1–5 minutes / 5–15 minutes / 15–30 minutes / over 30 minutes
   → *KPI "time to start working together" (baseline).*

6. **How many times in the last month did you lose someone's edits or sort out a merge conflict
   ("overwrote the file", "send me the latest version")?**
   (one answer): 0 / 1–2 / 3–5 / more than 5 / don't remember
   → *KPI "lost edits" (baseline).*

7. **How many times in the last month did someone lose their connection while working together?**
   (one answer): 0 / 1–2 / 3–5 / more than 5 / don't remember
   → *problem P6 and the priority of US-09: if fewer than a third had a break, US-09 becomes a Should.*

8. **What gets in the way most?** (up to three answers):
   people have to sign up or install programs / conflicts and lost edits /
   the code does not run for everyone ("works on my machine") / code, documents and diagrams are in
   different places / you can't see who is editing what / the connection drops or is slow /
   a paid plan is needed / other
   → *1.1 problems, 1.4 conclusions, MoSCoW priorities.*

9. **Have you used VS Code Live Share, Replit or CodeSandbox? What did you not like?**
   (paragraph, optional)
   → *1.3 analogues, "what is missing".*

10. **How important is it for you…** (grid, score 1–5: "not important at all" … "very important"):
    - to join a project by a link without signing up
    - to see other people's cursors and edits in real time
    - to run code right in the browser and see the result together
    - a text chat next to the code
    - a board for diagrams in the same project
    - to work without the internet and sync later
    - version history and undoing changes
    - pushing changes to GitHub
    → *MoSCoW: what is Must, what is Should/Could.*

11. **What would you add to such a tool?** (paragraph, optional)

---

## Interview plan (3–5 people, 10–15 minutes)

Take only notes (no audio), and don't use names in the work: "Respondent 1 (3rd-year student)".
At the start, ask for spoken consent: "May I use your answers in summary form in the diploma, without
your name?"

1. Tell me about the last time you worked on code together with someone. How was it organized, and which
   programs did you use?
2. How long did it take to start? What was the most inconvenient part?
3. Was there a case when edits were lost or you had to sort out a conflict? What happened?
4. Have you tried Live Share, Replit, CodeSandbox or Google Colab? Why did you stay or leave?
5. If there were one site with code, chat, a document and a board together, and you joined by a link,
   what would it have to have, and what could it do without?

---

## Pilot plan (5 pairs of newcomers, about 30 minutes per pair)

This plan measures the KPIs the same way for today's tools and for the platform.

1. Ask for spoken consent; don't write down names. The participants have not used the platform before.
2. The same small task twice: with the usual tools and on the platform. Two or three pairs start with the
   platform, so habit does not favour one side.
3. In each run, record:
   - KPI-1: seconds from the start of the invitation to the first edit of a partner without an account;
   - KPI-2: how many programs and sites are open for chat, code, the task and the diagram;
   - KPI-3: cut one person's connection for 30 seconds; then note whether work was lost or merged by hand;
   - KPI-4: which participants typed in the shared file themselves.
4. After the run, a short question: "Did the delay bother you? Score from 1 to 5."
5. On the platform: run the code and check that everyone sees the same output (problem P5).

Five pairs is a small sample: the result shows a direction, not statistics, and should be described that
way.

---

## Data to keep after collecting

- The export of the answers from Google Forms ("Responses" tab → spreadsheet icon → "Download CSV") or
  screenshots of the summary.
- Interview notes (short is fine).
- The pilot table: one row per run.

The percentages and medians then go into the Introduction, 1.1, 2.1 (KPI baselines), 2.2 (personas) and
2.10 of the BA.
