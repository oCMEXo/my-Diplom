# UX-спецификация

Материалы по критерию Refined UX.

| Что | Где |
|---|---|
| Спецификация (PDF для эксперта) | [`UX_Harminovich_Artsiom.pdf`](UX_Harminovich_Artsiom.pdf) |
| Исходник спецификации | [`ux-spec.html`](ux-spec.html) |
| Три ключевых сценария с ветками и ошибками | разделы 2–4 PDF; схемы — [`diagrams/`](diagrams) → `img/flow-*.png` |
| Визуальный стиль и библиотека компонентов | разделы 5–6 PDF; токены — `apps/web/src/index.css`, `apps/web/tailwind.config.js`; компоненты — `apps/web/src/components/ui` |
| Экраны с ошибками и валидацией (9 экранов) | раздел 7 PDF; снимки — `img/01-…10-*.png` |

## Как пересобрать

Снимки экранов делает автотест на тестовой базе (нужны Postgres и Redis из
`infra/docker-compose.dev.yml`):

```bash
UX_SCREENS=1 pnpm --filter @collab/e2e e2e -- ux-screens
```

Схемы сценариев (Mermaid, нужен интернет для загрузки Mermaid):

```bash
DIAGRAMS_SRC=docs/ux/diagrams DIAGRAMS_OUT=docs/ux/img node docs/ba/build/render-diagrams.mjs
```

PDF из HTML (Chrome через Playwright):

```bash
node docs/ux/build-pdf.mjs
```
