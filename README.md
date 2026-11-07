# my-designer

[简体中文](./README-cn.md) | English

---

## 1. Project Overview

- **What it is**: a frontend for a collection of design tools (Vue 3 + Vite + TypeScript). The home "Workspace" presents the design tools as a Warp (masonry) card list; hovering a card enlarges it and expands image previews, and clicking a preview shows the full image in a lightbox. The UI is bilingual (Simplified Chinese / English) and switches languages instantly.
- **Current version**: `0.1.3` (`package.json`).
- **Deployment**: GitHub Pages, repo `xystudiocode/my-designer`, live at <https://xystudiocode.github.io/my-designer/>; GitHub Actions builds and deploys automatically on every push to `main`.
- **Current data state**: the workspace has **2 cards**: "Color Preview" (`color-picker`, 3 preview images) and "Web colors" (`web-color`, 1 preview image). The color picker page has a unified picker for all **7 modes** (RGB / HSL / HWB / LAB / OKLCH / CMYK / YCbCr): for the 5 panel-first modes it shows a 2D panel with a vertical channel slider + an opacity slider plus a multi-slider area (all channels / opacity / manual inputs); RGB / CMYK only show the multi-slider area. It also has switchable / persisted axis controls, OKLCH gamut visualization (Display P3 / REC 2020 boundary lines, out-of-gamut white, fallback cards) and the existing persistence / deep links / history / palette / floating pager / EyeDropper features. The web colors page is feature-complete: display-mode selector (CSS named colors / web-safe colors, persisted), CSS name search, web-safe R/G/B filtering, section titles, result counts and an empty state (see §5.10).

---

## 2. Quick Start

### Environment

- Node.js: `^22.18.0 || >=24.12.0` (see `engines` in `package.json`)
- Package manager: npm (the repo has `package-lock.json`; CI uses `npm ci`)

### Common commands

```bash
npm install        # install dependencies
npm run dev        # dev server (http://localhost:5173 by default)
npm run build      # vue-tsc type check + production build into dist/
npm run preview    # preview the production build
npm run type-check # type check only (vue-tsc --build)
npm run test       # run Vitest unit tests once (test:watch for watch mode)
npm run lint       # oxlint + eslint (auto-fixes)
npm run format     # prettier --write src/
```

### Build / deployment notes

- `base` in `vite.config.ts` is overridden by the `DEPLOY_BASE` environment variable; CI builds with `DEPLOY_BASE=/my-designer/` (project-site sub-path).
- Deployment workflow: `.github/workflows/deploy.yml` (push to `main` or manual `workflow_dispatch`); after building it copies `dist/index.html` to `dist/404.html` as a fallback for direct access to sub-paths (e.g. `/about`) under history routing.
- Locally `base` is `/`; do not change it casually.

---

## 3. Tech Stack

| Dependency                                     | Version (convention) | Purpose                                                                                                                                                         |
| ---------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vue                                            | 3.5                  | Composition API + `<script setup>` + TS                                                                                                                        |
| Vite                                           | 8.x (Rolldown)       | Development / build                                                                                                                                             |
| Vue Router                                     | 5.x                  | SPA routing, history mode                                                                                                                                       |
| Pinia                                          | 4.x                  | State management (language preference)                                                                                                                          |
| Element Plus                                   | 2.14                 | UI components, **auto-imported on demand** via `unplugin-vue-components` (styles included); zh/en locale switches reactively                                    |
| unplugin-vue-components / unplugin-auto-import | 32.x / 21.x          | Element Plus components and APIs on demand (`vite.config.ts`)                                                                                                   |
| Tailwind CSS                                   | 4.x                  | Atomic styles, design tokens defined with `@theme static`                                                                                                       |
| Vitest                                         | 5.x                  | Unit tests (card data / i18n / colour conversions & modes / search & persistence), `npm run test`                                                               |
| vue-tsc / TypeScript                           | 3.x / 6.x            | Type checking                                                                                                                                                   |
| oxlint / ESLint / Prettier                     | 1.82 / 10 / 3.9      | Linting and formatting                                                                                                                                          |

Conventions: Element Plus components and styles are injected on demand at compile time by `unplugin-vue-components` / `unplugin-auto-import` in `vite.config.ts`; the entry still imports `src/assets/main.css` first, so Element Plus styles still come after Tailwind; `vue-tsc` relies on the root-generated `auto-imports.d.ts` / `components.d.ts` (must be committed); the `@` alias points to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

---

## 4. Directory Structure

```
.
├── .github/workflows/deploy.yml   # GitHub Pages auto deployment
├── public/                        # Static assets copied verbatim (favicon.ico)
├── src/
│   ├── assets/
│   │   ├── main.css               # Tailwind entry + @theme static design tokens + global font
│   │   ├── images/my-designer.svg # Header logo (48×48 SVG)
│   │   └── tools/previews/        # Card preview images (colorPicker1/2/3.png + webColor1.png; collection rules in §6)
│   ├── components/
│   │   ├── Card.vue               # Generic card shell (white bg / rounded corners / shadow / hover scale / panel positioning / transform-origin; shared by ToolCard and ColorCard)
│   │   ├── CardGrid.vue           # Generic Warp grid (generic + `#item` slot; computes column widths / positions / per-column origin; reusable by card-like components)
│   │   ├── LanguageSelector.vue   # Pill language selector on the right of the title bar
│   │   ├── ToolCard.vue           # A single tool card (hover scale, preview panel, Open button)
│   │   ├── ToolCardGrid.vue       # Workspace card grid: thin wrapper around CardGrid + ToolCard (keeps the old `cards` / `preview` API)
│   │   └── PreviewLightbox.vue    # Preview image lightbox
│   ├── data/
│   │   ├── tools.ts               # Workspace card data: toolCardDefinitions (2 cards) + type definitions + preview globs
│   │   ├── colors.ts              # Web colour data: 149 CSS named colours + standard 216 web-safe colours (webSafeColors)
│   │   └── __tests__/tools.spec.ts # Card data unit tests (unique id, copy keys, previews)
│   ├── i18n/
│   │   ├── index.ts               # useI18n(): reactive t() + locale
│   │   ├── messages.ts            # zh/en copy (zhCN is the baseline; en must cover every key)
│   │   └── __tests__/messages.spec.ts # i18n completeness unit tests (key alignment / non-empty / placeholders)
│   ├── router/index.ts            # Route table: / (workspace), /about, /card/color-picker, /card/web-color
│   ├── stores/
│   │   └── locale.ts              # Language preference store (defaults to browser + localStorage)
│   ├── views/
│   │   ├── HomeView.vue           # Workspace page
│   │   ├── AboutView.vue          # About page (tech stack / directory structure tables + open-source credits)
│   │   └── card/
│   │       ├── color-picker.vue   # Color picker tool page (layout / state / persistence / deep links / eyedropper / narrow-screen display color)
│   │       ├── web-color.vue      # Web colors page (display mode / search / R/G/B filter / result count / empty state)
│   │       ├── web-color/         # Web colors page private components and pure functions
│   │       │   ├── ColorCard.vue  # Color card derived from Card (origin / transparent support; More menu + "Open in color picker")
│   │       │   ├── CSSColor.vue   # CSS named colors grid (filtered items + CardGrid + ColorCard)
│   │       │   ├── WebSafeColor.vue # Web-safe colors grid (filtered items + CardGrid + ColorCard)
│   │       │   ├── SearchBox.vue  # Pill search box (clear button + Esc)
│   │       │   ├── WebSafeFilter.vue # R / G / B channel filters + "Reset filter"
│   │       │   ├── colorSearch.ts # Pure search / filter functions (query normalization, 3-digit hex expansion)
│   │       │   ├── webColorState.ts # Display-mode persistence (`my-designer:web-color`)
│   │       │   ├── types.ts       # Card item types (CssColorItem / WebSafeColorItem)
│   │       │   └── __tests__/colorSearch.spec.ts # Search / filter / persistence unit tests
│   │       └── color-picker/      # Color picker tool page private components and pure functions
│   │           ├── color.ts       # Color conversions (7 modes + LAB/OKLCH/YCbCr gamut mapping) / formatting / lightness palettes
│   │           ├── pickerState.ts # Settings persistence (incl. axes) / history / palette / deep-link query
│   │           ├── modes.ts       # 7 mode definitions: channels / ranges / layout / sliderBase / assistant palettes / OKLCH gamut info
│   │           ├── clipboard.ts   # Copy text to the clipboard (with fallback)
│   │           ├── SelectMenu.vue # Mode dropdown (animated indicator)
│   │           ├── ModeColorPicker.vue # Unified picker container (2D panel area + multi-slider area / narrow display color / gamut emit)
│   │           ├── ColorPanel.vue # 2D canvas panel (dpr / rAF / ResizeObserver; OKLCH gamut lines + labels)
│   │           ├── VerticalChannelSlider.vue # Vertical channel slider on the right of the 2D panel (top = min, bottom = max)
│   │           ├── OpacitySlider.vue # Horizontal opacity slider below the 2D panel (same alpha data as the multi-slider area)
│   │           ├── ChannelSliders.vue # Multi-slider area: all channel rows + opacity row (gradient tracks / number inputs / OKLCH markers)
│   │           ├── sliderTracks.ts # Pure track helpers shared by horizontal + vertical sliders (32 stops / white OKLCH stops / ticks / boundaries / alpha track)
│   │           ├── ManualInputs.vue # Manual inputs for all channels + opacity (panel-first, below the multi-slider rows)
│   │           ├── AxisControls.vue # Vertical slider / X / Y axis dropdowns + "Reset axes"
│   │           ├── SelectColorSection.vue # Wide-screen right-column "Select color" section (result card / out-of-gamut cards / Eyedropper)
│   │           ├── ColorUnits.vue # Right-side 8 unit values + copy animation
│   │           ├── DisplayColor.vue # 64×64 result card (checkerboard + current color / raw CSS; also used for the narrow "Display color")
│   │           ├── ColorAssistant.vue # Color assistant: two mode-aware lightness palettes + submenu
│   │           ├── ColorPager.vue # Floating pager (quick page bar + number input only on the current page)
│   │           ├── ColorHistory.vue # History swatch grid
│   │           ├── ColorPalette.vue # Palette (add current color + dynamic 3-rows/page pagination + delete + ColorPager)
│   │           ├── CopyIcon.vue   # Copy ↔ checkmark animated icon
│   │           ├── __tests__/color.spec.ts # Color conversion / formatting / gamut / palette unit tests
│   │           ├── __tests__/modes.spec.ts # Mode definitions / conversions / slider baselines / axis sanitizing / assistant palettes unit tests
│   │           ├── __tests__/sliderTracks.spec.ts # Track gradient / markers / alpha track unit tests (4 cases)
│   │           └── __tests__/pickerState.spec.ts # Persistence / axes / history / palette / deep-link query unit tests
│   ├── App.vue                    # App shell: header, nav, language selector, RouterView
│   └── main.ts                    # Entry: Pinia/Router (Element Plus on demand)
├── index.html
├── use.md                         # Local doc: how to add cards / color picker & web colors manual usage (ignored by .gitignore; copy manually when handing over)
├── vite.config.ts                 # Vite config (Element Plus on demand; dev ignores .tmp/.npm-cache watchers)
├── vitest.config.ts               # Vitest unit test config
├── auto-imports.d.ts              # unplugin-auto-import generated types (commit)
├── components.d.ts                # unplugin-vue-components generated component types (commit)
├── tsconfig*.json
├── eslint.config.ts / .oxlintrc.json / .prettierrc.json
└── README.md / README-cn.md
```

---

## 5. Features and Implementation Notes

### 5.1 App shell (`src/App.vue`)

- 56px title bar at the top: Logo + app name "XyStudio Designer" + subtitle "Practical · Design"; nav "Workspace / About"; `<LanguageSelector />` on the right.
- Nav active state: `bg-accent-80`; selected + hover `accent-75`; unselected hover `accent-95`.
- On language switch, `watchEffect` syncs `document.documentElement.lang` and `document.title` (no page reload).
- Wrapped in `<el-config-provider :locale>` so Element Plus built-in copy follows the UI language.
- Background: the root container uses `flex min-h-screen flex-col bg-slate-50` (**do not add `h-full`**, otherwise when the content is taller than the viewport, scrolling down reveals white); `body` also sets `background-color: #f8fafc` as a fallback.

### 5.2 Workspace (`src/views/HomeView.vue`)

- Page header: `home.listTitle` + `home.listSubtitle`.
- Card data: `toolCardDefinitions` mapped through `t()` into runtime data `{ title, desc, icon, previews }` and passed to `ToolCardGrid` (currently 2 cards: Color Preview / Web colors).
- **When there are no cards**, only the page header title and description are shown — the grid is not rendered and there is no empty-state hint (this is an explicit requirement).
- Clicking a preview → `PreviewLightbox`.

### 5.3 Warp card layout (`src/components/CardGrid.vue` + `src/components/ToolCardGrid.vue`)

- **The generic grid has been extracted into `CardGrid.vue`** (`<script setup generic="T">`): it only measures heights, computes positions and each column's zoom origin (`origin`); card rendering is delegated to the parent through the `#item` scoped slot (`{ item, index, origin }`); it can be reused directly outside the workspace (e.g. the `ColorCard` grids on the Web colors page).
- `CardGrid` constants: defaults `minCardWidth = 320`, `gap = 16` (can be overridden via props).
- Columns: `columns = floor((container width + gap) / (minCardWidth + gap))`, card width `(container width - gap × (columns - 1)) / columns`.
- Cards are placed in **array order** into the "currently shortest column", so the vertical spacing is always 16px and cards are not aligned to the tallest card (masonry effect).
- Positioned absolutely + `translate3d(x, y, 0)`; `ResizeObserver` watches the container width, `onUpdated` + `onMounted` measure the actual card heights before re-laying-out (copy wrapping and language switches all affect height).
- **Per-column origin**: `originFor()` returns `left top` (first column) / `right top` (last column) / `center top` (middle columns), passed to cards through the slot; cards then set `transform-origin` — edge cards only expand inward into the content area when hovered, so they never get pushed out of the visible area.
- The container is `opacity-0` before measurement completes to prevent flicker; the container height is the tallest column.
- Hovered / keyboard-focused cards get `z-index: 20` to cover neighbouring cards.
- `ToolCardGrid.vue` is now just a thin wrapper around `CardGrid` + `ToolCard` that keeps the original `cards` prop and `preview` event, so `HomeView` needs no changes.

### 5.4 Tool card (`src/components/ToolCard.vue`)

- Appearance: white background, 8px radius, 8px padding, soft shadow, `min-height: 200px` (**keep it**; the card is still at least 200px tall when collapsed), grows downward when content is insufficient, no inner scrollbar by default. The 200px minimum is applied by `ToolCard.vue`'s own `.tool-card` class, **not** by the shared `Card.vue` shell — other card types define their own minimum height, so changing it here must not touch them.
- The card shell (white background / rounded corners / shadow / hover scale / preview panel) has been extracted into `src/components/Card.vue`; `ToolCard.vue` reuses it through the default slot + the `#previews` slot; look at `Card.vue` first when changing card appearance.
- Content area (`.card-base__content` in `Card.vue`): wraps title + description and shrinks to the **actual height** (`min-height: 0`); the card itself still keeps the 200px minimum height above.
- Hover / keyboard focus (`:has(:focus-visible)`): the whole card gets `transform: scale(1.05)` (0.25s), bottom corners become 0, shadow deepens; **note** the original task doc required 1.05× and the current implementation is 1.05×. The scale origin is decided by `Card.vue`'s `origin` prop (`CardGrid` passes `left top` / `right top` / `center top` per column), so edge cards expand inward into the content area and never overflow the page's left/right edges.
- Preview panel: absolutely positioned at the **bottom of the content area** (8px below the last description line), no longer stuck to the very bottom of the card — otherwise a short description would be pushed far down by `min-height`. `Card.vue` uses a `ResizeObserver` to watch the content-area size and converts "content bottom + the card's 8px bottom padding" into the CSS variable `--card-previews-top` (restored proportionally by `offsetWidth` during the hover scale); expanding does not re-layout the Warp grid. The panel height **follows the first row of preview images** by default (image height + 8px padding, written to `--card-previews-max-height`) and is limited to **1.05 ~ 2.0×** the default card height visually (the whole card is `scale(1.05)` while hovered, so the 2.0× cap is converted back to layout size); when multiple images overflow, the panel scrolls vertically (6px thin scrollbar, accent color). The panel's white background covers the bottom whitespace left by the card's minimum height, which is visually equivalent to "a card collapsed to the description's real height + an expanded panel".
- Preview images: `width: min(480px, 100%)`, `aspect-ratio: 16/9`, `object-fit: cover`, 8px radius; clicking emits `preview` to open the lightbox.
- "Open" button: padding 8px, radius 4px; default `accent-60`, hover `accent-70`, active `accent-55`; when there is not enough room next to the title it wraps and takes the full row (`detectButtonWrap()` resets → forces reflow → measures `offsetTop`, avoiding self-locking).
- **Historical pitfall (fixed, do not regress)**: the expand condition must not use `:focus-within` — after clicking "Open" with the mouse the focus stays on the button, so the card would remain expanded after the pointer leaves; you must use `:has(:focus-visible)`.
- Clicking "Open" now does `router.push(card.to)`, navigating to `/card/color-picker` (color picker) or `/card/web-color` (web colors page, see 5.10).

### 5.5 Preview lightbox (`src/components/PreviewLightbox.vue`)

- `Teleport` to body, `z-index: 200`, `role="dialog" aria-modal="true"`, with title, a `current / total` counter, left/right arrows (shown when there are multiple images), and a close button.
- Interaction: `←` / `→` to switch, `Esc` or clicking the overlay closes; opening locks `documentElement.style.overflow`, closing restores it.

### 5.6 Language selector (`src/components/LanguageSelector.vue` + `src/stores/locale.ts`)

- Pill selector on the right of the title bar: "Browser settings" is **leftmost**, then "简体中文 / English" (language names always in their native script).
- Option buttons have 8px horizontal padding and unchanged vertical padding (pill height 24px, button hit area 40px); the hit area extends 4px on the left and right plus mask clipping, ensuring the visible pill is ≤ 200px; a custom 4px horizontal scrollbar is used (the native scrollbar is hidden).
- State colors: hover `accent-85`, selected `accent-60`, selected + hover `accent-70`; keyboard `←` / `→` switches (roving tabindex).
- Language logic (`src/stores/locale.ts`):
  - `LocaleCode = 'zh-CN' | 'en'`; preference `LocalePreference = LocaleCode | 'browser'`, default `'browser'` (follow the browser).
  - Persistence key: `localStorage['my-designer:locale']`, storing `'browser' | 'zh-CN' | 'en'`; invalid values fall back to `'browser'` without overwriting.
  - Resolution: primary browser language `zh` → `zh-CN`; anything else → `en` (`FALLBACK_LOCALE = 'en'`).
  - Switching language is a **reactive update** (`t()` re-evaluates), no page reload.

### 5.7 i18n (`src/i18n/`)

- `messages.ts`: `zhCN` is the baseline constant; `en` uses `Record<MessageKey, string>` to force coverage of every key; a missing key is a type error.
- `index.ts`: `useI18n()` returns `t(key, params?)` (supports `{name}` interpolation) and a `locale` computed.
- Copy sections: `app.*`, `nav.*`, `language.*`, `home.*`, `cards.*` (buttons / preview alt), `card.*` (card titles and descriptions), `colorPicker.*` (color picker tool page), `lightbox.*`, `about.*`.

### 5.8 About page (`src/views/AboutView.vue`)

- Static intro + dependency / directory structure tables (`el-table`); all copy goes through i18n.
- **Open-source credits** card: the OKLCH gamut visualization (P3 / REC 2020 boundary lines + gamut fallback) references the MIT-licensed [oklch-picker](https://github.com/evilmartians/oklch-picker); the link opens in a new tab and the reference repo itself is gitignored and excluded from ESLint (`eslint.config.ts`).

### 5.9 Color picker tool page (`src/views/card/color-picker.vue`)

- Route `/card/color-picker` (lazy-loaded), entered from the workspace "Open" button or ColorCard's "More → Open in color picker"; the page's two columns are 3:1 with a 16px gap in between; below 1100px it becomes a single column in the order **mode selector → picker (2D panel area + multi-slider area, each ending with a small "Display color" block; RGB / CMYK have only the multi-slider one) → color conversion → color assistant → history → palette** (implemented with `display: contents` + `order`; widescreen unchanged). In single-column mode `.picker-layout`'s flex column must explicitly set `align-items: stretch`: the widescreen grid's `align-items: start` would otherwise carry over to the flex column and make children shrink to their content width (the color conversion panel would be only 1/4 wide and the slider tracks would be 0 wide, showing only round thumbs, and dragging would set the value to 0).
- **Pitfall (fixed, do not regress)**: `.picker-editor` used to have a fixed `min-height: 220px`; it is now `min-height: 0`, so the height is naturally determined by the picker content and there is no fixed whitespace gap above the "Color assistant".
- Page state: `rgb: {r,g,b}` (0-255) + `alpha` (0-100, labelled "Opacity" in the UI) + `mode` + `axes` (per-mode vertical slider / X / Y axis settings) + `gamut` (OKLCH out-of-gamut info); child components write back through `update:rgb` / `update:alpha` / `update:axes` / `update:gamut`, and the page normalizes / clamps uniformly with `normalizeRgb`.
- **Mode dropdown** (`SelectMenu.vue`): 7 items RGB / HSL / HWB / LAB / OKLCH / CMYK / YCbCr; the trigger box and options both have 6px vertical padding (12px horizontal); the popup has an 8px radius + shadow + 0.18s enter/exit animation; slate/gray state colours, a gray-200 divider; the accent-60 4×16px pill indicator **does not follow mouse hover — it only slides to the item in 0.25s after the user clicks it** (the menu is delayed 0.25s before closing so the movement is visible); the selected item has 0 left padding so the text does not indent; supports outside click / Esc / ↑↓ / Enter.
- **Unified picker** (`ModeColorPicker.vue`, the page's only picker entry): all 7 modes are fully implemented; the old `RgbEditor.vue` / `HslEditor.vue` and the "This mode is not implemented yet" placeholder were removed. **Two areas are shown together** (the requirement "merge the sliders and the 2D panel" means both interaction methods at once): panel-first modes (HSL / HWB / LAB / OKLCH / YCbCr) render the **2D panel area** first (2D panel + vertical channel slider + horizontal opacity) and then the **multi-slider area** (all channel rows + opacity + manual inputs); sliders-first modes (RGB / CMYK) only render the multi-slider area (3 / 4 channel rows + opacity). Every multi-slider row has a gradient track + number input + label except the panel-first opacity row, whose number input is provided by `ManualInputs` (RGB / CMYK do not render `ManualInputs` because their slider rows already have inputs). Both areas have a bold title — "2D panel" (with the X / Y / slider channel names) and "Sliders"; "Axis controls" remains at the very bottom of the editor (panel-first only).
- **2D panel area** (`ColorPanel.vue` + `VerticalChannelSlider.vue` + `OpacitySlider.vue`): the panel width fills the column and its height is `clamp(240px, 42vh, 400px)` (260px at ≤1100px); the canvas is drawn per pixel with backing-store scaling by `devicePixelRatio`, redraws are coalesced with `requestAnimationFrame`, and a `ResizeObserver` handles size changes. Pointer drag + arrow keys (Shift ×10) / Home / End move the X / Y channels; the thumb is clamped inside the panel. On the right there is a **24px-wide vertical slider** for the channel chosen as the "slider" axis (top = minimum, bottom = maximum; pointer drag / ↑↓ with Shift ×10 / Home / End; it stretches to the panel height). Below the panel is the **horizontal opacity slider** (label "Opacity", same-colour transparent→opaque track with an 8px checkerboard); it and the opacity row in the multi-slider area share one `alpha` value, so either one updates the other. On narrow screens this area ends with a small "Display color" block.
- **Slider tracks** (`sliderTracks.ts`, shared by the horizontal rows in `ChannelSliders.vue` and the vertical slider): each track is a 32-stop gradient built with the other channels at their **reference baseline** (`sliderBase`): RGB / CMYK use the other channels' current values (the old RGB logic); HSL hue = saturated / l=50 reference, HSL lightness = `hsl(0, 0, L)`, HSL saturation = `hsl(0, S, 50)`; HWB hue = pure hue, HWB white/black = `h=0` with the other channel at 0; LAB l = neutral a/b, LAB a/b = `l=50`; YCbCr uses the 128 neutral for the other channels; OKLCH hue = `l=60, c=0.12`, OKLCH c = `l=60, h=0`, OKLCH l = `c=0, h=0`. Horizontal tracks use `linear-gradient(to right, …)` and the vertical track uses `linear-gradient(to bottom, …)`, both produced by the same `channelTrackColors()` / `channelTrackMarkers()` helpers. All modes end the multi-slider area with the opacity row; both opacity sliders use `alphaTrackBackground()` (same-colour transparent→opaque gradient over an 8px checkerboard).
- **Axis controls** (`AxisControls.vue`, panel-first modes only): three dropdowns switch which channel is used by the **vertical slider** / X axis / Y axis; choosing a channel already used elsewhere **swaps** the two positions so the three stay distinct; "Reset axes" restores the mode defaults. The settings are persisted with `my-designer:color-picker` (`axes` in the payload, key unchanged; old data without `axes` falls back to defaults) and restored after a refresh; illegal persisted values fall back to defaults (`sanitizeAxisSettings` / `sanitizeAxisSetting`). Changing the "slider" channel immediately re-binds the vertical slider to that channel.
- **OKLCH gamut visualization** (only OKLCH): the 2D panel checks every pixel against sRGB; pixels outside sRGB are painted **white** (`#ffffff`), and two boundary lines are drawn for Display P3 / REC 2020 (1 CSS px, with rotated labels `Display P3` / `REC 2020` following the line direction; the label anchor uses a PCA direction estimate and is clamped inside the panel). Slider track stops outside sRGB are also painted white on both the horizontal rows and the vertical slider; hue tracks get solid ticks every 60°, and the displayable ↔ non-displayable boundaries get dashed markers (vertical dashes on horizontal tracks, horizontal dashes on the vertical track; the opacity tracks are unaffected). On widescreen, selecting an out-of-sRGB colour splits the right-column "Select color" into 2-3 cards; "Fallback" sets the current colour to the mapped colour and resets the picker's local value so the result card returns to the single-card state.
- **"Select color"** (`SelectColorSection.vue` + `DisplayColor.vue`): **widescreen only**, in the right column; when the colour is inside sRGB there is one 64×64 checkerboard card with a 1px `--color-slate-300` border. When OKLCH selects an out-of-sRGB colour the card area splits into 2-3 cards: ① a dashed-border "Out of sRGB gamut" note card with the reason; ② a displayable fallback colour card (gamut mapping = CSS Color 4 chroma reduction) with a **"Fallback" button** that adopts the fallback colour; ③ a "Browser actual display" card using the raw `oklch()` CSS and letting the browser clip it (hidden when it equals the fallback colour). **Narrow screens (≤1100px)**: the right column is hidden and the editor shows a lightweight **"Display color"** block (label `colorPicker.displayColor` + 64×64 `DisplayColor` card, right-aligned) at the bottom of the 2D panel area and at the bottom of the multi-slider area — 2 blocks for panel-first modes, 1 for RGB / CMYK. These inline blocks do not include the out-of-gamut explanation / fallback / browser-actual-display cards or the Eyedropper button; that is an intentional tradeoff of the narrow layout.
- **Pick a color from the screen**: the button is part of `SelectColorSection.vue` (below the "Select color" card), using the `EyeDropper` API (the picked RGB becomes the current color and opacity is set to 100); it is therefore available only in the widescreen right column (the narrow inline "Display color" blocks do not contain it). If the browser does not support it, use Element Plus **`ElMessage.error(...)`** to show an error at the top of the page (`duration: 4000`, `offset: 16`, API and styles auto-injected), with the fixed copy **"当前浏览器不支持从屏幕选取颜色，请使用最新的 Edge / Chrome浏览器"** (i18n `colorPicker.eyedropperUnsupported`). The capability check / error notification lives in `color-picker.vue`; cancelling with Esc is silently ignored.
- **Right unit panel** (`ColorUnits.vue`): a bold "Color conversion" title above the card area (same style as the "Select color" title); 8 formats rendered by `formatColorEntries()`; opacity = 100 adds no transparency attribute, opacity < 100 → rgb becomes `rgba()`, hex becomes 8 digits, hsl becomes `hsla()`, hwb/lab/oklch get `/ a`, cmyk/ycbcr append `A: a`; clicking a card or the copy button copies and plays the CopyIcon "copy shrinks + checkmark draws in" animation (**checkmark draws in 0.25s**, reverses after 2s).
- **DisplayColor card** (`DisplayColor.vue`): the 64×64, 8px-radius checkerboard result card with a 1px `--color-slate-300` border (so pure white is still visible); it can render either an sRGB colour (`rgb` + `alpha`) or raw CSS (`css`, e.g. `oklch()` for the "Browser actual display" card). It is used as the "Select color" result card in the widescreen right column and as the small "Display color" block in the narrow editor areas.
- **History** (`ColorHistory.vue`): below "Color assistant" in the left column; at most 40 entries, newest first; when the same color (same RGB + opacity) appears again it is moved to the front instead of adding a duplicate. Saved on "stop operating for 600ms": the page uses `watch([rgb, alpha])` with debounce, covering slider release, 2D panel clicks, number input commits, EyeDropper picks and all other colour-change paths; not written on page entry or deep-link application. On swatch hover / keyboard focus a delete button appears in the top-right corner (`emit remove(index)`; the page removes with `removeHistoryColor()` and persists; deletion does not trigger apply). Swatches have a 1px `--color-slate-300` border (the inner colour overlay would cover an inset shadow, so a real border is required to see the boundary on white / light colors).
- **Palette** (`ColorPalette.vue`): added manually by clicking "Add current color", unlimited (duplicates are deduped and moved to the front); **items per page = the current actual column count × `PALETTE_PAGE_ROWS` (3)** (measure the column count with a ResizeObserver reading `gridTemplateColumns`; at 1440 wide → 18 columns → 54 per page, 1024 → 51, 768 → 36; before columns are measured it falls back to `PALETTE_PAGE_SIZE` (54)); after the column count changes it re-paginates automatically and clamps the page number; the swatch area always reserves 3 rows of height (`.palette-body` min-height = 3×40 + 2×12 = 144px, grid `align-content: start`), so the height does not shrink when the last page has only 1 row, and the pager y and the vertical centre of the side arrows stay stable; new colors are inserted at the front and automatically return to page 1; on swatch hover / focus a delete button appears in the top-right corner. Swatches have a 1px `--color-slate-300` border (visible on white / light colors too). The grid is wrapped in `.palette-body` with a 44px gutter on each side (<640px → 40px) for the floating arrows, which never cover swatches.
- **Floating pager** (`ColorPager.vue` + `ColorPalette.vue`): a persistent trigger shows "Page x / y"; on hover / focus a page picker pops up above it (only the quick page bar: up to 5 page numbers including the current one, with a small arrow at each end); **only the currently selected page's number turns into a number input when clicked** (Enter/blur commits, Esc cancels), while clicking another page number jumps directly without an input. On both sides of the palette there are 32×32 semi-transparent floating arrows (`rgb(13 13 13 / 0.5)` background + `#E6E6E6` rounded SVG arrow), which appear when moving the mouse in the palette area and hide after ~2.3s of rest (+0.18s fade) or when leaving the area; they stay visible while the pointer is on them; the page-picker popup area (`[data-color-pager-popover]`) does not count as a trigger area; the left arrow is not rendered on the first page and the right arrow not on the last page (hide instead of disabling when you cannot page).
- **User settings persistence** (`pickerState.ts`): localStorage key `my-designer:color-picker`, storing `{ rgb, alpha, mode, axes, history, palette }`; page init `loadPickerSettings()` restores automatically (color / opacity / mode / axes / history / palette), and any change immediately `savePickerSettings()`. All reads/writes are wrapped in try/catch (falls back to defaults in private mode / when storage is disabled); old payloads without `axes` and illegal axis entries fall back to the defaults.
- **Deep links** (`pickerState.ts` + `color-picker.vue`): `/card/color-picker?color=E5254D&mode=hsl&alpha=80`; `color` accepts hex (with or without `#`, 3/4/6/8 digits) / `rgb()` / `rgb()` space syntax / `hsl()` / `hsla()`, `mode` only accepts the 7 picking modes, and `alpha` overrides the transparency carried by the color text. **When entering with a query, the locally saved current color is not loaded automatically**; instead the query's color/mode is applied and written back to the settings ("the color you navigate to should modify the settings"), then `router.replace` clears the query (so a refresh does not return to the old color); only when there is no query is the full local settings restored. Jump URLs are generated with `buildColorPickerLocation()`; usage is in `use.md`.
- **Color assistant** (`ColorAssistant.vue`): a hint under the title, "Click to get color information."; **the lightness source follows the current picking mode**: LAB / OKLCH use their own L and YCbCr uses Y (offsets are 5% of that channel's range, and palette colours are gamut-mapped while holding that lightness, so 100% → white and 0% → black), while RGB / HSL / HWB / CMYK keep using the HSL lightness (`assistantLightnessPalettes()` in `modes.ts`); palettes based on brightness ±5% offsets (duplicates clamped to the channel ends keep only the entry closest to the current brightness) and a fixed 5%-100% palette, 10-column grid, 40px swatches / 8px radius, hover darkens 2% / active darkens 6%; clicking a swatch opens a Teleported submenu (same colours as the dropdown, 11px small text, 8 formats + copy, **left edge aligned with the swatch's left edge**, closes on outside click / Esc / scroll / resize); every row's hover area in the submenu is clickable to copy, not just the copy button. The submenu bottom has a gray-200 divider + a "Save to palette" action row: it emits the swatch color (keeping the current opacity) to the page, which calls `addPaletteColor()` and closes the submenu.
- All format conversions and gamut math live in `color.ts`: rgb↔hsl, hex, hwb, lab (D65), oklch, cmyk, ycbcr; linear sRGB ↔ XYZ(D65) ↔ Display P3 / REC 2020 matrices; `oklchGamutStatus`, `gamutMapOklchToRgb` / `gamutMapLabToRgb` / `gamutMapYcbcrToRgb` (lightness-preserving gamut mapping), `oklchToCss`, `lightnessSwatchesInRange` / `allLightnessSwatchesInRange` and `OutOfGamutInfo`. `__tests__/color.spec.ts` covers conversion round trips, transparency rules, gamut mapping and palette count / dedup / colour; `modes.ts` (mode definitions / conversions / slider baselines / axis sanitizing / assistant lightness palettes) is covered by `__tests__/modes.spec.ts` (35 cases); `sliderTracks.ts` (32-stop track colours / markers / alpha track) is covered by `__tests__/sliderTracks.spec.ts` (4 cases).
- Tool-page private components all live under `src/views/card/<tool>/` (see §4); when adding a tool page, do not put tool-specific components into `src/components/`; the exception is `src/components/CardGrid.vue` (a generic Warp grid unrelated to business logic). The colour card `ColorCard.vue` is a Web colors page private component at `src/views/card/web-color/ColorCard.vue` (no longer a global generic component).

### 5.10 Web colors page (`src/views/card/web-color.vue`)

- Route `/card/web-color` (lazy-loaded); the entry is the "Open" button of the 2nd workspace card "Web colors". The page is feature-complete: a "Display mode:" selector at the top (CSS named colors / web-safe colors), a pill search box (CSS mode) or R/G/B filter row (web-safe mode) on the right, a section title + result count + empty state, then the `ColorCard` grid.
- **Display mode** (`SelectMenu.vue` + `webColorState.ts`): options "CSS named colors" / "Web-safe colors", default CSS named colors; the choice is written to `localStorage['my-designer:web-color']` (`{ mode }`) and restored on refresh; invalid / corrupt values fall back to the default (all reads / writes in try/catch).
- **CSS named colors mode** (`CSSColor.vue`): data comes from `toolCardDefinitions` in `src/data/colors.ts` (`ColorCardDefinition[]`, 149 unique `shorthand`; the array has one duplicate `aqua`, deduped with a `Set` on `shorthand`); colour names go through i18n `webColor.colors.css.<name>` (149 keys in each of zh and en). The page builds `CssColorItem[]` with both the zh and en names as the search index, so searching works in either language regardless of the current UI language.
- **CSS search** (`SearchBox.vue` + `colorSearch.ts`): a pill-shaped search box on the right of the toolbar; it indexes the Chinese name / English name / shorthand / HEX, ignores case and the `#` prefix, supports 3-digit hex expansion (`#f00` matches `#ff0000`) and contains matching; a clear button appears when non-empty and Esc also clears (focus stays in the input). No match → empty-state hint; the grid is not rendered.
- **Web-safe colors mode** (`WebSafeColor.vue`): `webSafeColors` is generated by `generateWebSafeColors()` from the standard `00 / 33 / 66 / 99 / cc / ff` levels (216 unique colours, `#000000` … `#ffffff`) and rendered as a `ColorCard` grid without shorthand / name. The toolbar shows three channel filters (`WebSafeFilter.vue`): R / G / B each with "Any" + the six levels; all three apply together; the "Reset filter" button is disabled when no filter is active.
- **Section titles / count / empty state**: the section title (`webColor.cssSection` / `webColor.webSafeSection`) and the result count (`webColor.count`, `role="status" aria-live="polite"`) sit on one line; when the result set is empty only the empty-state card is shown.
- **Card data and layout**: the two list components (`CSSColor.vue` / `WebSafeColor.vue`) are now pure renderers — they no longer carry their own `max-w-[1440px] px-6 py-10` container (the page provides it); both reuse `CardGrid`, so card width / column count / masonry / per-column `origin` match the workspace. The `origin` / `transparent` props of `ColorCard` were added for these grids.
- **Shared code**: `colorSearch.ts` (pure search / filter functions), `webColorState.ts` (display-mode persistence), `types.ts` (card item types), plus 18 unit tests in `__tests__/colorSearch.spec.ts` (search / filter / persistence); the page component itself has no DOM-level tests.
- **`transparent` special case**: `{ shorthand: 'transparent', color: 'transparent' }` in `colors.ts` is not hex; the page sets its `rgb` to `{0,0,0}`, `alpha = 0` and passes `transparent`; `ColorCard` then shows only the checkerboard, the HEX box shows the CSS keyword `transparent`, the "shorthand" copy box is hidden, and the "More" popover hides the 8-format list and divider, keeping only "Open in color picker".

---

## 6. Card mechanism (core extension point)

**Data flow**: `src/data/tools.ts` (`ToolCardDefinition[]`) → `HomeView` maps with `t()` into `ToolCardData[]` → `ToolCardGrid` (thin wrapper) → `CardGrid` (computes column widths / positions / per-column origin) → `ToolCard` (renders).

**Type definitions** (`src/data/tools.ts`):

```ts
export interface ToolCardData {
  title: string
  desc: string
  icon: string
  previews: string[]
  to: string
}

export interface ToolCardDefinition {
  id: string
  titleKey: MessageKey
  descKey: MessageKey
  icon: string
  previews: string[]
  to: string
}
```

- `icon` has two forms: ① only the SVG path's `d` (the component wraps `<svg viewBox="0 0 24 24" stroke="currentColor" …>`); ② full `<svg>` code (starts with `<svg`, inserted via `v-html`, fixed 32×32 size).
- `previews`: an array of preview image URLs; `tools.ts` uses two `import.meta.glob(..., { eager: true })` calls (`colorPicker*.png` and `webColor*.png`) plus `sortedPreviews()` to collect images automatically sorted by filename, so putting images named `colorPicker*.png` / `webColor*.png` into `src/assets/tools/previews/` makes them available to the matching card (other new cards can still hand-write the `import` array); multiple images are supported and switch with `←` / `→` in the lightbox. The `web-color` card now has `webColor1.png`, so the "every card has at least one usable preview" test passes.
- `to`: the in-app path the "Open" button navigates to; it must be registered in `src/router/index.ts` (currently `color-picker` → `/card/color-picker`, `web-color` → `/card/web-color`).
- Four steps to add a card: add preview image assets → append the definition (including `to`) to `toolCardDefinitions` → add zh/en copy in `messages.ts` (`titleKey` / `descKey`) → create `src/views/card/<tool>.vue` and register a route matching `to` in the route table.
- **`ColorCard.vue` (`src/views/card/web-color/ColorCard.vue`) is not a workspace card**: it is a colour display card derived from `Card.vue` (64×64 swatch + optional name / shorthand copy box / HEX copy box + "More" conversion menu + "Open in color picker"). Props: `rgb` (required), `alpha` (default 100), `shorthand` / `name` (optional; omitting them gives the "no shorthand" variant), `mode` (default `rgb`, carried into the deep link), `origin` (zoom origin, passed by `CardGrid`), `transparent` (transparent-colour special case). It is used by both grids on `/card/web-color` only (the old `/card/test-router-color` page no longer exists).
- **`src/data/colors.ts`**: web colour data (unrelated to the workspace `tools.ts`; it just exports a same-named `toolCardDefinitions` — both files use that name, so watch out for aliasing when importing). `ColorCardDefinition { titleKey, shorthand, color }` where `color` is a CSS colour string (hex or `'transparent'`); the array is alphabetically ordered with one duplicate (`aqua`), and the display layer dedupes by `shorthand` (149 unique entries incl. `transparent`; 149 i18n keys per language). `webSafeColors: string[]` is the standard 216-colour web-safe palette (`00 / 33 / 66 / 99 / cc / ff` combinations, 216 unique values). The web-safe array is exercised by `web-color/__tests__/colorSearch.spec.ts` (asserts 216 colours and covers search / filter / persistence).
- Detailed steps, examples and FAQs are in the root **`use.md`** (ignored by `.gitignore`; copy it along with the repo when handing over).

---

## 7. Design tokens and style conventions (`src/assets/main.css`)

- Defined in `@theme static` (always output as CSS variables, so hand-written component CSS can use `var()`):
  - Accent: `--color-accent-50` ~ `--color-accent-100`, `oklch(50%~100% 0.2 25)` (50 is the darkest, 100 the lightest).
  - Text: `--text-subtitle: 14px` (maps to the `text-subtitle` utility class).
  - Extra default-palette variables used by hand-written CSS: `--color-slate-400/500`, `--color-gray-200/400` — Tailwind only outputs `:root` variables for colours "used by utility classes"; colours not used by any utility class must be declared explicitly in `@theme static`, otherwise `var()` gets no value.
- Global font: Inter / system font stack; `html, body, #app { height: 100% }`.
- Component styles are mainly hand-written CSS in `<style scoped>`, with Tailwind utilities for layout and colours; when adding cards / components, prefer reusing the accent variables and the existing rhythm of 8px radius, 8px padding and 16px spacing.

---

## 8. Routes

| Path                      | Component                                                 | Description                                                                                                            |
| ------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/`                       | `HomeView` (synchronous import)                           | Workspace                                                                                                              |
| `/about`                  | `AboutView` (lazy-loaded, separate chunk)                 | About page                                                                                                             |
| `/card/color-picker`      | `src/views/card/color-picker.vue` (lazy-loaded)           | Color picker tool page (7 modes, 2D panel + sliders + manual inputs, axis controls, OKLCH gamut visualization, unit panel, color assistant, history, palette, EyeDropper, deep links) |
| `/card/web-color`         | `src/views/card/web-color.vue` (lazy-loaded)              | Web colors page (display mode, CSS name search, web-safe R/G/B filter, result count, empty state, ColorCard grids)     |

history mode, `createWebHistory(import.meta.env.BASE_URL)`; `404.html` is used on GitHub Pages as a fallback for sub-paths.

---

## 9. Handover checklist

1. `git status` to confirm uncommitted changes (see §10); `npm install`.
2. Run the checks:
   ```bash
   npm run type-check
   npm run lint
   npm run test
   npm run build
   npm run dev   # open http://localhost:5173 in the browser
   npx prettier --check src/
   ```
   Current expectation (this round has been verified): `type-check` / `lint` / `build` pass; `npm run test` is **107/107 green across 7 test files**; `npx prettier --check src/` passes. `npm run format` rewrites `src/` only — do not run it for documentation-only changes.
3. Manual browser checks:
   - The workspace shows **2 cards** "Color Preview" (3 preview images) and "Web colors" (1 preview image); hovering scales the card and expands preview images **below the last description line**, and the expanded total height is about **1.05 ~ 2.0×** the default card height; multiple images (the color picker card) scroll inside the panel;
   - Clicking a preview image → the lightbox opens, `←/→` switches, `Esc` closes, page scroll is restored;
   - Clicking "Open" → navigates to `/card/color-picker` or `/card/web-color`, browser back / the top "Workspace" nav returns; after hovering and expanding, moving the mouse away collapses the card properly;
   - Color picker (`/card/color-picker`):
     - **Mode dropdown**: 7 items (RGB / HSL / HWB / LAB / OKLCH / CMYK / YCbCr, no HEX); the indicator only moves after clicking an option (0.25s), not on hover; all 7 modes render a complete picker (no "not implemented" placeholder);
     - **Layout**: RGB has 3 slider rows, CMYK 4 (each row = gradient track + number input + label, opacity row last); HSL / HWB / LAB / OKLCH / YCbCr show the 2D panel area first (2D panel + vertical channel slider on its right + horizontal opacity below) and then the multi-slider area (all channel rows + opacity + manual inputs); the panel height is ~`clamp(240px, 42vh, 400px)` (260px on narrow screens); panel and slider areas have bold titles (the 2D header shows the current X / Y / slider channels), and "Axis controls" is at the bottom;
     - **Sliders**: dragging every horizontal channel slider, the vertical slider and either opacity slider keeps the number inputs / manual inputs / right-side unit values / 64×64 display card in sync; the two opacity sliders share one value; opacity < 100 makes HEX 8 digits and YCbCr / CMYK append `A:`; gradient tracks use the documented reference baselines (RGB / CMYK: other channels keep their current values), and the horizontal / vertical tracks are generated by the same `sliderTracks.ts`;
     - **Axis controls** (5 panel-first modes): switch the vertical slider / X axis / Y axis; choosing an already-used channel swaps the two positions; changing the "slider" channel re-binds the vertical slider; "Reset axes" restores the defaults; the settings survive a page refresh; corrupt persisted axes fall back to defaults after a refresh;
     - **OKLCH**: the 2D panel paints out-of-sRGB pixels white and draws the Display P3 / REC 2020 boundary lines with their labels; horizontal and vertical slider tracks paint out-of-sRGB stops white and hue tracks show solid 60° ticks / dashed gamut boundaries; on widescreen selecting an out-of-sRGB colour turns "Select color" into 2-3 cards (dashed "Out of sRGB gamut" note + fallback card with a "Fallback" button + "Browser actual display" when it differs), and clicking "Fallback" changes the current colour to the mapped fallback and restores the single result card;
     - **Widescreen vs narrow**: at 1440 px there is only the right-hand "Select color" block (no inline display colour); at 1024 / 768 / 375 px the page scrolls in one column in the order mode selector → picker (2D panel area + multi-slider area; each area ends with a right-aligned "Display color" block, so panel-first modes have 2 and RGB / CMYK have 1) → color conversion → color assistant → history → palette; the narrow inline blocks do not show the out-of-gamut cards or Eyedropper button (intentional tradeoff), and there is no horizontal scrollbar / value-0 slider bug;
     - Clicking a unit card / copy button plays the checkmark animation (0.25s draw, reset after 2s); the color assistant palettes follow the current picking mode's lightness (LAB / OKLCH L, YCbCr Y, other modes HSL; 100% is white and 0% near black) and its submenu works as before (whole row copies, "Save to palette" adds the swatch colour); on widescreen both "Color conversion" and "Select color" have bold titles, and the 64×64 card has a 1px border (visible when white);
     - **History / palette / pager**: history (40 max, dedupe, 600ms debounce, delete, survives refresh) and palette (columns×3 per page, 3-row reservation, side arrows, pager input only on the current page) behave as before;
     - **Pick a color from the screen**: the Eyedropper button lives in the widescreen right-column "Select color" section only (not in the narrow inline "Display color" blocks); in a normal browser it can be called (cancelling does not error); with `window.EyeDropper` set to null, clicking shows an Element Plus `ElMessage` error at the top of the page (`.el-message--error`) with the fixed copy, auto-dismissing in about 4s;
     - **Persistence / deep links**: after changing colour / mode / axes / history / palette and refreshing, everything is restored; visiting `/card/color-picker?color=E5254D&mode=hsl&alpha=80` does not load the old "Select color" but applies the query and writes it back, and the URL query is then cleared; ColorCard's "More → Open in color picker" works this way;
   - Web colors page (`/card/web-color`): title "Web Colors"; **CSS named colours** is the default mode and has a pill search box — searching by Chinese name / English name / shorthand / HEX works (case-insensitive, `#` optional, `#f00` matches `#ff0000`, contains matching), the clear button and Esc clear it, the result count updates and a no-match empty state replaces the grid; each card scales on hover and the `transparent` card shows only the checkerboard with HEX `transparent` and no shorthand box; **web-safe colours** mode has 216 cards, the R / G / B filters (Any + 00/33/66/99/cc/ff) combine, and "Reset filter" is disabled when nothing is filtered; switching modes and refreshing restores the last mode; no console errors;
   - About page: the dependency / structure tables render correctly and the new "Open-source credits" card links to the OKLCH picker reference (MIT);
   - The language selector at the top-right: "Browser settings" highlighted by default; switching to "English" instantly changes all page copy to English (including card titles, buttons, preview alt, Element Plus component copy, and the new picker / web-colour copy) without reloading; the language persists after a refresh;
   - Shrinking the window to 1024 / 768 width: the card column count changes, with no horizontal scrollbar.
4. Before committing: run `npm run format` only if `src/` changed, then re-run the checks in step 2. `git add` `src/assets/tools/` as well (otherwise the CI build fails); make sure the root `auto-imports.d.ts` / `components.d.ts` are committed (the `vue-tsc` type check in CI depends on them); `use.md` is ignored by `.gitignore`, so copy it along with the repo when handing over.

---

## 10. Development / debugging tips

- The local Vite dev server is available at `http://localhost:5173`; historically it once listened only on the IPv6 `::1`, so if `127.0.0.1` does not connect use `localhost` (or `http://localhost:5188` when the port is taken).
- How browser automation was verified this round (the CDP scripts are under `.tmp/verify/*.mjs` with the shared client `.tmp/cdp.mjs`; verification screenshots are under `.tmp/shots/`; these are gitignored local assets and are not in the repo):
  - Start headless Edge: `msedge.exe --headless=new --remote-debugging-port=9333 --user-data-dir=<temp dir> --window-size=1280,900 about:blank`;
  - Node (≥22, with a global `WebSocket`) gets the page's `webSocketDebuggerUrl` from `http://127.0.0.1:9333/json/list` and sends `Page.navigate` / `Input.dispatchMouseEvent` / `Page.captureScreenshot` / `Runtime.evaluate` over CDP;
  - Keyboard interaction uses `Input.dispatchKeyEvent` (Tab, Escape, arrow keys); screenshots use `Page.captureScreenshot` (`deviceScaleFactor: 2` gives @2x).
- On Windows, Vite file watching occasionally throws `EBUSY` (e.g. an editor holding `use.md`); ignore it, and restart the dev server if necessary. `vite.config.ts` already adds `.tmp/**` and `.npm-cache/**` to `server.watch.ignored` — a headless browser's `--user-data-dir` also writes files continuously, so during automated verification put it in a system temp directory (e.g. `$env:TEMP`), not in the repo's `.tmp/`, otherwise it triggers full-page reloads / EBUSY.
- Do not leave temporary scripts in the repo (`.tmp/`, `.npm-cache/`, etc. are already in `.gitignore`, but deleting them is safer).

---

## 11. Key file quick reference

| Need                                                        | Where to change                                                                                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add / edit / delete cards                                   | `src/data/tools.ts` + `src/i18n/messages.ts` (steps in `use.md`)                                                                                       |
| Card appearance, hover scale, preview panel, Open button    | `src/components/ToolCard.vue` + `src/components/Card.vue` (shell / expanded panel positioning)                                                          |
| Warp layout (columns, gaps, breakpoints, per-column origin) | `src/components/CardGrid.vue` (generic grid) + `src/components/ToolCardGrid.vue` (workspace thin wrapper)                                               |
| Lightbox behaviour                                          | `src/components/PreviewLightbox.vue`                                                                                                                    |
| Workspace header / empty state                              | `src/views/HomeView.vue`                                                                                                                                |
| Language selector UI                                        | `src/components/LanguageSelector.vue`                                                                                                                   |
| Language preference and persistence                         | `src/stores/locale.ts`                                                                                                                                  |
| Chinese / English copy                                      | `src/i18n/messages.ts`                                                                                                                                  |
| Accent / spacing / text size tokens                         | `src/assets/main.css`                                                                                                                                   |
| Header, nav, Element Plus locale                            | `src/App.vue`                                                                                                                                           |
| Routes                                                      | `src/router/index.ts`                                                                                                                                   |
| "Open" button navigation target                             | `to` in `src/data/tools.ts` + the matching route in `src/router/index.ts`                                                                               |
| Color picker tool page                                      | `src/views/card/color-picker.vue` + `src/views/card/color-picker/`                                                                                      |
| Unified picker / 2D panel / vertical slider / opacity / multi-slider / manual inputs / axes | `color-picker/ModeColorPicker.vue` / `ColorPanel.vue` / `VerticalChannelSlider.vue` / `OpacitySlider.vue` / `ChannelSliders.vue` / `ManualInputs.vue` / `AxisControls.vue` |
| Slider track gradients / markers (horizontal + vertical) | `color-picker/sliderTracks.ts` (tests in `color-picker/__tests__/sliderTracks.spec.ts`) |
| Mode definitions (channels / ranges / layout / slider base / assistant palettes) | `color-picker/modes.ts` (tests in `color-picker/__tests__/modes.spec.ts`) |
| Color conversion / formatting / gamut math / brightness palette | `color-picker/color.ts` (tests in `color-picker/__tests__/color.spec.ts`)                                                                           |
| User settings persistence / axes / history / palette / deep-link query | `color-picker/pickerState.ts` (tests in `color-picker/__tests__/pickerState.spec.ts`)                                                        |
| Mode dropdown                                               | `color-picker/SelectMenu.vue`                                                                                                                           |
| "Select color" section (wide-screen right column) / result card / gamut fallback / Eyedropper | `color-picker/SelectColorSection.vue` / `DisplayColor.vue`; the Eyedropper logic is inline in `color-picker.vue` (error copy is fixed); narrow editor areas reuse `DisplayColor` as "Display color" |
| Unit panel / copy animation / color assistant               | `color-picker/ColorUnits.vue` / `CopyIcon.vue` / `ColorAssistant.vue`                                                                                    |
| History / palette / floating pager                          | `color-picker/ColorHistory.vue` / `ColorPalette.vue` / `ColorPager.vue`                                                                                  |
| "Open in color picker" deep link                            | `buildColorPickerLocation()` in `pickerState.ts` + "Opening the color picker through app navigation" in `use.md`                                        |
| Web colors page / display mode / search / R-G-B filter      | `src/views/card/web-color.vue` + `web-color/` (`SearchBox.vue` / `WebSafeFilter.vue` / `CSSColor.vue` / `WebSafeColor.vue`)                             |
| Web colour search & settings persistence                    | `web-color/colorSearch.ts` + `web-color/webColorState.ts` (tests in `web-color/__tests__/colorSearch.spec.ts`)                                          |
| Web colour data (149 CSS names / standard 216 web-safe)     | `src/data/colors.ts`                                                                                                                                    |
| Web colour card (transparent, origin, More menu)            | `src/views/card/web-color/ColorCard.vue` (Web colors page only)                                                                                         |
| Page background / shell scroll white-out                    | The root container in `src/App.vue` (do not add `h-full`) + the body background in `src/assets/main.css`                                                |
| Element Plus on-demand imports / auto-import types          | `vite.config.ts`; `auto-imports.d.ts`, `components.d.ts` (commit)                                                                                       |
| Unit tests (running / config / cases)                       | `vitest.config.ts`, `src/**/__tests__/` (`npm run test`)                                                                                                |
| Deployment (sub-path, 404 fallback)                         | `vite.config.ts` (`DEPLOY_BASE`) + `.github/workflows/deploy.yml`                                                                                        |
