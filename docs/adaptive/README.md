# Adaptive UI

Collab works on phones, tablets and desktops, in both orientations and with browser zoom. This page
says how, and where to check it.

- **Mock-ups and component library (PDF):** [Adaptive_UI_Harminovich_Artsiom.pdf](Adaptive_UI_Harminovich_Artsiom.pdf),
  11 pages: requirements, the component library, and the screens on phone, tablet and desktop, in
  landscape, at 200% zoom and in the light theme. The screenshots are also in [img](img).
- **Component library in the app:** `/design-system` (locally http://localhost:5173/design-system).
  It is built from the same React components as the screens, and it measures the contrast of every
  text color live.
- **Automatic check:** [e2e/tests/adaptive.spec.ts](../../e2e/tests/adaptive.spec.ts)

## How each requirement is met

| Requirement | How it is done | Where |
|---|---|---|
| 3 kinds of devices, orientation change, browser zoom | Mobile-first breakpoints: base styles for phones, `sm` 640, `md` 768, `lg` 1024 px add columns. The editor header uses container queries, so it adapts to its own width. | `apps/web/tailwind.config.js`, `pages/ProjectPage.tsx`, `components/layout/ProjectHeader.tsx` |
| Responsive grid and relative units, nothing overlaps | CSS grid and flexbox. Font sizes and spacing are in `rem`, so browser zoom scales the whole interface. Row actions in the file list and the delete button on project cards sit next to their link, never on top of it. | `components/layout/FileTree.tsx`, `pages/ProjectsPage.tsx` |
| Main navigation on every device | Desktop: project rail, file list and chat always visible. Phone and tablet: the same navigation opens from the menu and chat buttons in the editor header, as full-height drawers. | `pages/ProjectPage.tsx`, `components/layout/SidePanel.tsx` |
| Touch targets of at least 44 px | On touch screens (`pointer: coarse`) every button, link, field, tab and menu item has `min-height` and `min-width` of 44 px. Actions that appear on hover with a mouse are always visible on touch screens. | `apps/web/src/index.css` |
| Text contrast WCAG 2.1 AA (4.5:1) | All text colors pass on all backgrounds in both themes. The lowest is 5.03:1 in the dark theme and 5.09:1 in the light one. | `apps/web/src/index.css`, `/design-system` |
| One palette and typography | Colors are CSS variables with a dark and a light theme. Inter for the interface, JetBrains Mono for code. Sizes are the same on all devices; only the layout changes. | `apps/web/src/index.css`, `apps/web/tailwind.config.js` |
| Mock-ups for 3 devices with reusable components | The PDF above, made from the real app by [build.mjs](build.mjs). | `docs/adaptive` |

## The automatic check

`e2e/tests/adaptive.spec.ts` opens 8 screens (landing, sign in, sign up, invite link, design system,
projects, project, editor) on 7 screen sizes, in the dark and the light theme:

| Size | Viewport |
|---|---|
| Small phone | 320 × 640, touch |
| Phone | 375 × 812, touch |
| Phone, landscape | 812 × 375, touch |
| Tablet | 768 × 1024, touch |
| Tablet, landscape | 1024 × 768, touch |
| Desktop | 1440 × 900, mouse |
| Desktop at 200% zoom | 720 × 450 (a 1440 × 900 window zoomed to 200%), mouse |

On each screen it fails if:

- the page scrolls sideways;
- two controls overlap;
- on a touch screen, a button, link, field or tab is smaller than 44 × 44 px;
- a visible text has less than 4.5:1 contrast with its real background (3:1 for large text).

It runs with the other end-to-end tests on every push:

```bash
pnpm --filter @collab/e2e e2e -- adaptive
```

## Rebuilding the PDF

Start the API and the web app (`pnpm dev:api`, `pnpm dev:collab`, `pnpm dev:web`), then:

```bash
node docs/adaptive/build.mjs
```

It creates demo data through the API, takes the screenshots with Playwright and prints the PDF. Use
`WEB_URL` and `API_URL` for other addresses.

