# UX specification

Materials for the Refined UX criterion.

| What | Where |
|---|---|
| Specification (PDF for the expert) | [`UX_Harminovich_Artsiom.pdf`](UX_Harminovich_Artsiom.pdf) |
| Source of the specification | [`ux-spec.html`](ux-spec.html) |
| Three key scenarios with branches and errors | sections 2–4 of the PDF; diagrams in [`diagrams/`](diagrams) → `img/flow-*.png` |
| Visual style and component library | sections 5–6 of the PDF; tokens in `apps/web/src/index.css` and `apps/web/tailwind.config.js`; components in `apps/web/src/components/ui` |
| Screens with errors and validation (9 screens) | section 7 of the PDF; screenshots in `img/01-…10-*.png` |

## How to rebuild

The screenshots are taken by an automated test on a test database (it needs the Postgres and Redis from
`infra/docker-compose.dev.yml`):

```bash
UX_SCREENS=1 pnpm --filter @collab/e2e e2e -- ux-screens
```

Scenario diagrams (Mermaid; needs the internet to load Mermaid):

```bash
DIAGRAMS_SRC=docs/ux/diagrams DIAGRAMS_OUT=docs/ux/img node docs/ba/build/render-diagrams.mjs
```

PDF from the HTML (Chrome through Playwright):

```bash
node docs/ux/build-pdf.mjs
```
