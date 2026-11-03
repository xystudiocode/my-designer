[简体中文](./README-cn.md) | English

# my-designer

Useful design tools.

A Vue 3 + Vite + TypeScript frontend for a design-tool suite. The **Workspace** (`/`) presents a Warp-style card list of tools:
hover a card to enlarge it and reveal its image previews, or click a preview to inspect it in a lightbox.
The UI is fully bilingual (简体中文 / English) and switches language instantly without reloading the page.

## Features

- **Warp-style tool list** — cards flow horizontally with 16px gaps and wrap when the next card no longer fits.
  Cards are packed into the shortest column, so vertical gaps stay 16px and never align to the tallest card.
- **Card visuals** — white surface with an 8px radius, soft shadow and 8px padding; cards have no inner scrollbar and grow
  downward when content needs more room.
- **Hover expansion** — hovering (or focusing) a card scales the card and all of its children to 1.25× in 0.25s.
  Image previews then expand below the card in a wrap layout with 16px gaps (~480×270 preview cards, fluid on narrow screens); the expanded card is
  capped at twice its normal height and shows a vertical scrollbar when previews overflow.
- **Preview lightbox** — click any preview to open it larger, browse with ← / → and close with Esc or the close button.
- **Buttons** — `accent-60` by default, `accent-70` on hover and `accent-55` when pressed. Buttons sit beside the card
  title and automatically become a full-width row when there is not enough space at the side.
- **Bilingual UI** — 简体中文 / English across the app (including the Element Plus locale). Language changes are reactive
  (no page reload) and persisted in `localStorage`; by default the app follows the browser language.
- **Design tokens** — the accent palette and shared text sizes are declared in `src/assets/main.css` (`@theme static`),
  so component styles can reuse them through CSS variables.

## Tech Stack

| Dependency                 | Description                                                    |
| -------------------------- | -------------------------------------------------------------- |
| Vue 3                      | Composition API + `<script setup>` + TypeScript                |
| Vite                       | Dev server and production build                                |
| Vue Router                 | SPA routing (history mode)                                     |
| Pinia                      | Global state management                                        |
| Element Plus               | UI components — globally registered, all icons, zh/en locale switched reactively |
| Tailwind CSS               | Atomic CSS via the `@tailwindcss/vite` plugin (v4)             |
| ESLint / Oxlint / Prettier | Linting and code formatting                                    |

## Quick Start

```sh
npm install
npm run dev
```

The dev server runs at <http://localhost:5173> by default.

## Scripts

| Command              | Description                                |
| -------------------- | ------------------------------------------ |
| `npm run dev`        | Start the dev server (HMR)                 |
| `npm run build`      | Type-check + production build into `dist/` |
| `npm run preview`    | Preview the production build locally       |
| `npm run type-check` | Run `vue-tsc` type checking only           |
| `npm run lint`       | Run Oxlint + ESLint and auto-fix issues    |
| `npm run format`     | Format `src/` with Prettier                |

## Project Structure

```
.
├── public/                  # Static assets (copied as-is)
├── src/
│   ├── assets/
│   │   ├── main.css         # Tailwind entry, @theme design tokens
│   │   └── tools/previews/  # Placeholder preview images (SVG)
│   ├── components/
│   │   ├── LanguageSelector.vue  # Pill language switcher in the title bar
│   │   ├── ToolCard.vue          # Hover-expanding tool card
│   │   ├── ToolCardGrid.vue      # Warp (masonry) layout
│   │   └── PreviewLightbox.vue   # Full-size preview dialog
│   ├── data/tools.ts        # Tool card definitions (title/desc keys, icon, previews)
│   ├── i18n/                # Reactive zh/en messages and t() composable
│   ├── router/index.ts      # Route table
│   ├── stores/              # Pinia stores (locale, counter)
│   ├── views/               # Page-level components
│   ├── App.vue              # Root component / app shell
│   └── main.ts              # Application entry
├── env.d.ts                 # Vite client types
├── vite.config.ts           # Vite config (@ alias, Tailwind, Vue DevTools)
└── eslint.config.ts         # Flat ESLint config
```

## Conventions

- **Element Plus** is imported in full (`app.use(ElementPlus)`) for the lowest onboarding cost. If bundle size becomes a concern, switch to on-demand imports with `unplugin-vue-components` + `unplugin-auto-import`.
- **Tailwind CSS v4** needs no `tailwind.config.js` — `@import 'tailwindcss';` in `src/assets/main.css` is enough, and theme customization uses the `@theme` block.
- **Style order**: `main.css` (including Tailwind's preflight) is imported before Element Plus styles so component styles take precedence.
- **Alias**: `@` points to `src/`, configured in both `vite.config.ts` and `tsconfig.app.json`.
- **i18n**: text lives in `src/i18n/messages.ts` (English must cover every Chinese key — enforced by types); components call `useI18n()` and render `t('key')`, so language changes re-render without a reload.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).
