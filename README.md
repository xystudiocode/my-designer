[简体中文](./README-cn.md) | English

# my-designer

Useful design tools.

A Vue 3 frontend project initialized from the official `create-vue` template, with the common ecosystem dependencies wired up so feature development can start right away.

## Tech Stack

| Dependency                 | Description                                                    |
| -------------------------- | -------------------------------------------------------------- |
| Vue 3                      | Composition API + `<script setup>` + TypeScript                |
| Vite                       | Dev server and production build                                |
| Vue Router                 | SPA routing (history mode)                                     |
| Pinia                      | Global state management                                        |
| Element Plus               | UI components — globally registered, Chinese locale, all icons |
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
├── public/                 # Static assets (copied as-is)
├── src/
│   ├── assets/
│   │   └── main.css        # Tailwind entry and global styles
│   ├── components/         # Reusable components
│   ├── router/index.ts     # Route table
│   ├── stores/             # Pinia stores
│   ├── views/              # Page-level components
│   ├── App.vue             # Root component / app shell
│   └── main.ts             # Application entry
├── env.d.ts                # Vite client types
├── vite.config.ts          # Vite config (@ alias, Tailwind, Vue DevTools)
└── eslint.config.ts        # Flat ESLint config
```

## Conventions

- **Element Plus** is imported in full (`app.use(ElementPlus)`) for the lowest onboarding cost. If bundle size becomes a concern, switch to on-demand imports with `unplugin-vue-components` + `unplugin-auto-import`.
- **Tailwind CSS v4** needs no `tailwind.config.js` — `@import 'tailwindcss';` in `src/assets/main.css` is enough, and theme customization uses the `@theme` block.
- **Style order**: `main.css` (including Tailwind's preflight) is imported before Element Plus styles so component styles take precedence.
- **Alias**: `@` points to `src/`, configured in both `vite.config.ts` and `tsconfig.app.json`.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).
