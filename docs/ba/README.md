# Business analysis (BA)

| File | What it is |
|---|---|
| `BA_Harminovich_Artsiom.docx` | The finished document (built from `BA.md` and `BA-back.md`) |
| `BA.md` | Introduction, chapter 1, chapter 2 |
| `BA-back.md` | List of references (Chicago, alphabetical), appendices 1 (backlog), 2 (diagrams, mock-ups, full text of UC-2), 3 (questionnaire), 4 (KLM estimate), 5 (terms), statement on the use of AI |
| `build/references.mjs` | Sources in Chicago style: the full entry for the list and the short one for notes; the text cites a source as `[@key]` |
| `survey.md` | Questionnaire for Google Forms, interview plan and pilot plan; not run yet |
| `diagrams/*.mmd` | Diagram sources (Mermaid) → `img/*.png` |
| `img/` | Diagrams, screenshots of analogues and mock-ups |
| `build/klm-estimate.mjs` | The KPI-1 estimate for appendix 4 |

Rebuild the document after changes:

```bash
node docs/ba/build/render-diagrams.mjs
```

```bash
node docs/ba/build/build-docx.mjs
```

The table of contents is written with page numbers already, so Word asks nothing when the file opens. The
numbers follow the same layout as Word; if they ever differ, right-click the table of contents →
"Update field". The mock-ups in `img/mockup-*.png` are copies from `docs/thesis/screenshots/`.

## Where the starting KPI values come from

There was no survey, interview or pilot, so the text has no numbers from them and says so directly. The
problem is called a hypothesis. The baseline and the target are measured by the same pilot (section 2.10),
and the values below are only first estimates.

| KPI | Starting value | Source |
|---|---|---|
| KPI-1, time to the first shared edit | 105 s (partner without an account); the same model gives 30 s for the platform | KLM estimate (Card, Moran, Newell, 1980), appendix 4. A lower bound, not a measurement |
| KPI-2, tools | 5; target 3 for Must and 1 for Must + Should | AS-IS process model, figure 1.1 |
| KPI-3, sessions with lost work | Unknown; the pilot measures it with a planned 30 s connection break. The 17% from Brun et al. is about Git merges, not live sessions, so it is only context | Brun et al., ESEC/FSE 2011 |
| KPI-4, typing together | 50% in a pair (one person types), estimated from the process model. The 100 ms threshold (Nielsen, 1993) is now only in NFR-P1 | Figure 1.1 |

If the survey and the pilot are run (`survey.md`), their answers replace the estimates in the
Introduction, 1.1, 2.1 and 2.10.
