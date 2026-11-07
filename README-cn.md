# my-designer

简体中文 | [English](./README.md)

---

## 1. 项目简介

- **是什么**：一个设计工具集合前端（Vue 3 + Vite + TypeScript）。首页「工作台」以 Warp（瀑布流）卡片列表展示设计工具，卡片悬浮时放大并展开图片预览，点击预览查看大图；界面中英文双语、切换即时生效。
- **当前版本**：`0.1.3`（`package.json`）。
- **部署**：GitHub Pages，仓库 `xystudiocode/my-designer`，线上地址 <https://xystudiocode.github.io/my-designer/>，`main` 分支 push 后由 GitHub Actions 自动构建部署。
- **当前数据状态**：工作台有 **2 张卡片**：「颜色预览」（`color-picker`，3 张预览图）与「网页颜色」（`web-color`，1 张预览图）。颜色选择器已实现 **7 种模式**（RGB / HSL / HWB / LAB / OKLCH / CMYK / YCbCr）的统一取色器：5 种二维色板模式同时显示「二维色板 + 右侧竖向滑块 + 横向不透明度」与「多滑块区（全部分量 / 不透明度 / 手动输入）」，RGB / CMYK 只显示多滑块区；另有可切换且持久化的坐标轴控制、OKLCH 色域可视化（Display P3 / REC 2020 边界线、超色域白色、回退卡片），并保留配置持久化、深链接、历史记录、调色板、悬浮翻页与 EyeDropper 取色；网页颜色页功能完整：显示模式选择（CSS 命名色 / 网页安全色，记忆上次选择）、CSS 颜色搜索、网页安全色 RGB 筛选、分区标题、结果计数与空状态（见 5.10）。

---

## 2. 快速开始

### 环境

- Node.js：`^22.18.0 || >=24.12.0`（见 `package.json` 的 `engines`）
- 包管理器：npm（仓库有 `package-lock.json`，CI 用 `npm ci`）

### 常用命令

```bash
npm install        # 安装依赖
npm run dev        # 开发服务器（默认 http://localhost:5173）
npm run build      # vue-tsc 类型检查 + 生产构建到 dist/
npm run preview    # 预览生产构建
npm run type-check # 只做类型检查（vue-tsc --build）
npm run test       # 运行 Vitest 单元测试（一次性；test:watch 为监听模式）
npm run lint       # oxlint + eslint（会自动修复）
npm run format     # prettier --write src/
```

### 构建 / 部署要点

- `vite.config.ts` 的 `base` 由环境变量 `DEPLOY_BASE` 覆盖；CI 构建使用 `DEPLOY_BASE=/my-designer/`（项目站点子路径）。
- 部署工作流：`.github/workflows/deploy.yml`（push `main` 或手动 `workflow_dispatch`）；构建后把 `dist/index.html` 复制成 `dist/404.html`，用于 history 路由下直接访问子路径（如 `/about`）的兜底。
- 本地开发时 `base` 为 `/`，不要随意改。

---

## 3. 技术栈

| 依赖                       | 版本（约定）    | 用途                                                           |
| -------------------------- | --------------- | -------------------------------------------------------------- |
| Vue                        | 3.5             | Composition API + `<script setup>` + TS                        |
| Vite                       | 8.x（Rolldown） | 开发/构建                                                      |
| Vue Router                 | 5.x             | SPA 路由，history 模式                                         |
| Pinia                      | 4.x             | 状态管理（语言偏好）                                           |
| Element Plus               | 2.14            | UI 组件，`unplugin-vue-components` **按需自动引入**（含样式）；中英文 locale 响应式切换 |
| unplugin-vue-components / unplugin-auto-import | 32.x / 21.x | Element Plus 组件与 API 按需引入（`vite.config.ts`）           |
| Tailwind CSS               | 4.x             | 原子化样式，`@theme static` 定义设计令牌                       |
| Vitest                     | 5.x             | 单元测试（卡片数据 / i18n / 颜色转换与模式 / 搜索与持久化），`npm run test` |
| vue-tsc / TypeScript       | 3.x / 6.x       | 类型检查                                                       |
| oxlint / ESLint / Prettier | 1.82 / 10 / 3.9 | 规范检查与格式化                                               |

约定：Element Plus 组件与样式由 `vite.config.ts` 的 `unplugin-vue-components` / `unplugin-auto-import` 在编译期按需注入，入口仍先引入 `src/assets/main.css`，保证 Element Plus 样式仍在 Tailwind 之后；`vue-tsc` 依赖根目录自动生成的 `auto-imports.d.ts` / `components.d.ts`（必须提交）；`@` 别名指向 `src/`（`vite.config.ts` + `tsconfig.app.json` 同时配置）。

---

## 4. 目录结构

```
.
├── .github/workflows/deploy.yml   # GitHub Pages 自动部署
├── public/                        # 原样复制的静态资源（favicon.ico）
├── src/
│   ├── assets/
│   │   ├── main.css               # Tailwind 入口 + @theme static 设计令牌 + 全局字体
│   │   ├── images/my-designer.svg # 头部 Logo（48×48 SVG）
│   │   └── tools/previews/        # 卡片预览图（colorPicker1/2/3.png + webColor1.png；收集规则见第 6 节）
│   ├── components/
│   │   ├── Card.vue               # 通用卡片外壳（白底 / 圆角 / 阴影 / 悬浮放大 / 展开面板定位 / transform-origin，ToolCard 与 ColorCard 复用）
│   │   ├── CardGrid.vue           # 通用 Warp 网格（泛型 + `#item` 插槽；计算列宽 / 位置 / 每列 origin，卡片类可复用）
│   │   ├── LanguageSelector.vue   # 标题栏右侧的胶囊语言选择框
│   │   ├── ToolCard.vue           # 单张工具卡片（悬浮放大、预览面板、打开按钮）
│   │   ├── ToolCardGrid.vue       # 工作台卡片网格：CardGrid + ToolCard 的薄封装（保留 `cards` / `preview` 旧 API）
│   │   └── PreviewLightbox.vue    # 预览大图灯箱
│   ├── data/
│   │   ├── tools.ts               # 工作台卡片数据：toolCardDefinitions（2 张）+ 类型定义 + 预览图 glob
│   │   ├── colors.ts              # 网页颜色数据：149 个 CSS 命名色 + 标准 216 色网页安全色（webSafeColors）
│   │   └── __tests__/tools.spec.ts # 卡片数据单测（id 唯一、文案 key、预览图）
│   ├── i18n/
│   │   ├── index.ts               # useI18n()：响应式 t() + locale
│   │   ├── messages.ts            # 中英文文案（zhCN 基准，en 必须全覆盖）
│   │   └── __tests__/messages.spec.ts # i18n 完整性单测（key 对齐 / 非空 / 占位符）
│   ├── router/index.ts            # 路由表：/（工作台）、/about、/card/color-picker、/card/web-color
│   ├── stores/
│   │   └── locale.ts              # 语言偏好 store（默认跟随浏览器 + localStorage）
│   ├── views/
│   │   ├── HomeView.vue           # 工作台页面
│   │   ├── AboutView.vue          # 关于页（技术栈 / 目录结构表格 + 开源借鉴）
│   │   └── card/
│   │       ├── color-picker.vue   # 颜色选择器工具页（布局 / 状态 / 持久化 / 深链接 / 取色器 / 窄屏两个显示颜色）
│   │       ├── web-color.vue      # 网页颜色页（显示模式 / 搜索 / RGB 筛选 / 结果计数 / 空状态）
│   │       ├── web-color/         # 网页颜色页私有组件与纯函数
│   │       │   ├── ColorCard.vue  # 从 Card 派生的颜色卡片（origin / transparent 支持；更多菜单 + 「在颜色选择器中打开」）
│   │       │   ├── CSSColor.vue   # CSS 命名色网格（筛选后的数据 + CardGrid + ColorCard）
│   │       │   ├── WebSafeColor.vue # 网页安全色网格（筛选后的数据 + CardGrid + ColorCard）
│   │       │   ├── SearchBox.vue  # 胶囊搜索框（清空按钮 + Esc）
│   │       │   ├── WebSafeFilter.vue # R / G / B 三通道筛选 + 「重置筛选」
│   │       │   ├── colorSearch.ts # 搜索 / 筛选纯函数（搜索词归一化、3 位 HEX 展开）
│   │       │   ├── webColorState.ts # 显示模式持久化（`my-designer:web-color`）
│   │       │   ├── types.ts       # 卡片数据类型（CssColorItem / WebSafeColorItem）
│   │       │   └── __tests__/colorSearch.spec.ts # 搜索 / 筛选 / 持久化单测
│   │       └── color-picker/      # 颜色选择器工具页私有组件与纯函数
│   │           ├── color.ts       # 颜色转换（7 模式 + LAB/OKLCH/YCbCr 色域映射）/ 格式化 / 亮度色板
│   │           ├── pickerState.ts # 用户配置持久化（含坐标轴）/ 历史记录 / 调色板 / 深链接 query
│   │           ├── modes.ts       # 7 种模式定义：分量 / 范围 / 布局 / sliderBase / 配色助手色板 / OKLCH 色域信息
│   │           ├── clipboard.ts   # 复制文本到剪贴板（含降级）
│   │           ├── SelectMenu.vue # 模式下拉选择框（动画指示器）
│   │           ├── ModeColorPicker.vue # 统一取色器容器（二维图区域 + 多滑块区域 / 窄屏显示颜色 / 色域回传）
│   │           ├── ColorPanel.vue # 二维色板（canvas 逐像素、dpr / rAF / ResizeObserver；OKLCH 色域线与标签）
│   │           ├── VerticalChannelSlider.vue # 二维图右侧竖向滑块（顶部 = 最小值、底部 = 最大值）
│   │           ├── OpacitySlider.vue # 二维图下方横向不透明度滑块（与多滑块区的不透明度同一份数据）
│   │           ├── ChannelSliders.vue # 多滑块区：全部分量行 + 不透明度行（渐变轨道 / 数字输入 / OKLCH 分隔线）
│   │           ├── sliderTracks.ts # 横 / 竖向滑块共用的纯函数（32 停靠点、OKLCH 白色停靠点 / 60° 刻度 / 色域边界、不透明度轨道）
│   │           ├── ManualInputs.vue # 全部分量 + 不透明度手动输入（二维色板模式，位于多滑块行下方）
│   │           ├── AxisControls.vue # 竖向滑块 / 横轴 / 纵轴下拉 + 「重置坐标轴」
│   │           ├── SelectColorSection.vue # 宽屏右栏「选择颜色」区块（结果卡 / 超色域卡片 / 取色按钮）
│   │           ├── ColorUnits.vue # 右侧 8 种单位取值 + 复制动画
│   │           ├── DisplayColor.vue # 64×64 结果色卡（棋盘格 + 当前颜色 / 原始 CSS；窄屏「显示颜色」也用它）
│   │           ├── ColorAssistant.vue # 配色助手两套跟随模式亮度的色板 + 子菜单
│   │           ├── ColorPager.vue # 悬浮翻页器（快速选页条 + 仅当前页可输入页码）
│   │           ├── ColorHistory.vue # 历史记录色块网格
│   │           ├── ColorPalette.vue # 调色板（添加当前颜色 + 3 行/页动态分页 + 删除 + ColorPager）
│   │           ├── CopyIcon.vue   # 复制 ↔ 对勾动画图标
│   │           ├── __tests__/color.spec.ts # 颜色转换 / 格式化 / 色域映射 / 色板单测
│   │           ├── __tests__/modes.spec.ts # 模式定义 / 转换 / 滑块基准 / 坐标轴校验 / 配色助手色板单测
│   │           ├── __tests__/sliderTracks.spec.ts # 轨道渐变 / 分隔线 / 不透明度轨道单测（4 例）
│   │           └── __tests__/pickerState.spec.ts # 持久化 / 坐标轴 / 历史 / 调色板 / 深链接 query 单测
│   ├── App.vue                    # 应用外壳：头部、导航、语言选择框、RouterView
│   └── main.ts                    # 入口：Pinia/Router（Element Plus 按需引入）
├── index.html
├── use.md                         # 本地文档：如何添加卡片 / 颜色选择器与网页颜色页手动操作说明（已被 .gitignore 忽略，交接时手动拷贝）
├── vite.config.ts                 # Vite 配置（Element Plus 按需引入；dev 忽略 .tmp/.npm-cache 监听）
├── vitest.config.ts               # Vitest 单元测试配置
├── auto-imports.d.ts              # unplugin-auto-import 生成的类型（需提交）
├── components.d.ts                # unplugin-vue-components 生成的组件类型（需提交）
├── tsconfig*.json
├── eslint.config.ts / .oxlintrc.json / .prettierrc.json
└── README.md / README-cn.md
```

---

## 5. 功能与实现要点

### 5.1 应用外壳（`src/App.vue`）

- 顶部 56px 标题栏：Logo + 应用名「XyStudio 的设计器」+ 副标题「实用 · 设计」；导航「工作台 / 关于」；右侧 `<LanguageSelector />`。
- 导航选中态：`bg-accent-80`，选中 + 悬浮 `accent-75`；未选中悬浮 `accent-95`。
- 语言切换时通过 `watchEffect` 同步 `document.documentElement.lang` 和 `document.title`（不刷新页面）。
- 外层包 `<el-config-provider :locale>`，让 Element Plus 自带文案跟随界面语言。
- 背景：根容器用 `flex min-h-screen flex-col bg-slate-50`（**不要加 `h-full`**，否则内容比视口高时滚动到下方会露出白色）；`body` 也设置了 `background-color: #f8fafc` 兜底。

### 5.2 工作台（`src/views/HomeView.vue`）

- 页头：`home.listTitle` + `home.listSubtitle`。
- 卡片数据：`toolCardDefinitions` 经 `t()` 映射成运行时数据 `{ title, desc, icon, previews }`，交给 `ToolCardGrid`（当前 2 张：颜色预览 / 网页颜色）。
- **无卡片时**只显示页头标题与描述，不渲染网格、也没有空状态提示（这是明确需求）。
- 点击预览 → `PreviewLightbox` 大图灯箱。

### 5.3 Warp 卡片布局（`src/components/CardGrid.vue` + `src/components/ToolCardGrid.vue`）

- **通用网格已抽成 `CardGrid.vue`**（`<script setup generic="T">`）：只负责测量高度、计算位置与每列的放大原点（`origin`），卡片渲染通过 `#item` 作用域插槽交给父级（`{ item, index, origin }`）；工作台之外（网页颜色页的 `ColorCard` 网格）也可直接复用。
- `CardGrid` 常量：默认 `minCardWidth = 320`、`gap = 16`（可传 props 覆盖）。
- 列数：`columns = floor((容器宽 + gap) / (minCardWidth + gap))`，卡片宽 `(容器宽 - gap × (列数 - 1)) / 列数`。
- 卡片按**数组顺序**放进「当前最矮的一列」，因此竖向间距恒为 16px，不会按最高卡片对齐（瀑布流效果）。
- 用绝对定位 + `translate3d(x, y, 0)` 摆放；`ResizeObserver` 监听容器宽度、`onUpdated` + `onMounted` 测量卡片实际高度后重排（文案换行、语言切换都会影响高度）。
- **每列 origin**：`originFor()` 返回 `left top`（第 1 列）/ `right top`（最后一列）/ `center top`（中间列），通过插槽传给卡片，卡片再设置 `transform-origin`——贴边列的悬浮放大只朝内容区内侧扩张，不会把卡片顶出可视区域。
- 测量完成前容器 `opacity-0` 防闪；容器高度取各列最高值。
- 悬浮/键盘聚焦的卡片 `z-index: 20` 盖住相邻卡片。
- `ToolCardGrid.vue` 现在只是 `CardGrid` + `ToolCard` 的薄封装，保留原来的 `cards` prop 与 `preview` 事件，`HomeView` 无需改动。

### 5.4 工具卡片（`src/components/ToolCard.vue`）

- 外观：白底、8px 圆角、8px padding、柔和阴影、`min-height: 200px`（**保留**，卡片收起时仍至少 200px 高），内容不足时向下生长，默认无内部滚动条。200px 最小高度由 `ToolCard.vue` 自己的 `.tool-card` 类设置，**不再**写在共用的 `Card.vue` 外壳里——其他卡片类型各自定义最小高度，改这里时不要动到它们。
- 卡片外壳（白底 / 圆角 / 阴影 / 悬浮放大 / 预览面板）已抽成 `src/components/Card.vue`，`ToolCard.vue` 通过默认插槽 + `#previews` 插槽复用它；改卡片外观先看 `Card.vue`。
- 内容区（`Card.vue` 的 `.card-base__content`）：包住标题 + 描述，按**真实高度**收缩（`min-height: 0`）；卡片本身仍保留上面的 200px 最小高度。
- 悬浮 / 键盘聚焦（`:has(:focus-visible)`）：整卡 `transform: scale(1.05)`（0.25s），底部圆角变 0，阴影加深；**注意**原始任务文档要求 1.05 倍，当前实现是 1.05 倍。缩放原点由 `Card.vue` 的 `origin` prop 决定（`CardGrid` 按列传入 `left top` / `right top` / `center top`），贴边卡片向内容区内侧放大，不会溢出页面左右边界。
- 预览面板：绝对定位在**内容区底部**（描述最后一行下方 8px），不再贴在卡片最底部——否则描述较短时面板会被 `min-height` 撑到很下面。`Card.vue` 用 `ResizeObserver` 监听内容区尺寸，把「内容底部 + 卡片 8px 下内边距」换算成 CSS 变量 `--card-previews-top`（悬浮缩放时按 `offsetWidth` 还原比例）；展开不重排 Warp 布局。面板高度默认**跟随第一行预览图**（图高 + 8px 内边距，用 `--card-previews-max-height` 写入），并限制整体视觉高度为默认卡高的 **1.05 ~ 2.0 倍**（悬浮时整卡 `scale(1.05)`，所以 2.0 倍上限按缩放换算回布局尺寸）；多张图超出时面板内竖向滚动（6px 细滚动条，主色）。面板白色背景会盖住卡片因最小高度留出的底部空白，视觉上等价于「按描述真实高度收起的卡片 + 展开面板」。
- 预览图：`width: min(480px, 100%)`、`aspect-ratio: 16/9`、`object-fit: cover`，圆角 8px；点击 emit `preview` 打开灯箱。
- 「打开」按钮：padding 8px、圆角 4px；默认 `accent-60`、悬浮 `accent-70`、按下 `accent-55`；标题旁放不下时自动换行并占满整行（`detectButtonWrap()` 复位 → 强制 reflow → 测量 `offsetTop`，避免自锁）。
- **历史坑（已修，勿回退）**：展开条件不能用 `:focus-within`——鼠标点击「打开」后焦点留在按钮上，会导致鼠标移开后卡片仍卡在展开态；必须用 `:has(:focus-visible)`。
- 当前点击「打开」会 `router.push(card.to)`，分别跳到 `/card/color-picker`（颜色选择器）或 `/card/web-color`（网页颜色页，见 5.10）。

### 5.5 预览灯箱（`src/components/PreviewLightbox.vue`）

- `Teleport` 到 body，`z-index: 200`，`role="dialog" aria-modal="true"`，带标题、`当前 / 总数` 计数、左右箭头（多张时显示）、关闭按钮。
- 交互：`←` / `→` 切换，`Esc` 或点击遮罩关闭；打开时锁定 `documentElement.style.overflow`，关闭恢复。

### 5.6 语言选择框（`src/components/LanguageSelector.vue` + `src/stores/locale.ts`）

- 标题栏右侧胶囊选择框：「浏览器设置」在**最左**，之后是「简体中文 / English」（语言名固定用母语原文）。
- 选项按钮横向 padding 8px、上下不变（胶囊高 24px、按钮命中区 40px），左右各外扩 4px 命中区 + 蒙版裁切，保证可见胶囊 ≤ 200px；自定义 4px 横向滚动条（隐藏原生滚动条）。
- 状态色：悬浮 `accent-85`，选中 `accent-60`，选中 + 悬浮 `accent-70`；键盘 `←` / `→` 可切换（roving tabindex）。
- 语言逻辑（`src/stores/locale.ts`）：
  - `LocaleCode = 'zh-CN' | 'en'`；偏好 `LocalePreference = LocaleCode | 'browser'`，默认 `'browser'`（跟随浏览器）。
  - 持久化 key：`localStorage['my-designer:locale']`，写入 `'browser' | 'zh-CN' | 'en'`；非法值回退 `'browser'` 且不覆盖。
  - 解析规则：浏览器语言主标签为 `zh` → `zh-CN`；其余 → `en`（`FALLBACK_LOCALE = 'en'`）。
  - 切换语言是**响应式更新**（`t()` 重新求值），不刷新页面。

### 5.7 i18n（`src/i18n/`）

- `messages.ts`：`zhCN` 作为基准常量，`en` 用 `Record<MessageKey, string>` 强制覆盖全部 key；缺 key 会类型报错。
- `index.ts`：`useI18n()` 返回 `t(key, params?)`（支持 `{name}` 插值）和 `locale` computed。
- 文案分区：`app.*`、`nav.*`、`language.*`、`home.*`、`cards.*`（按钮 / 预览 alt）、`card.*`（卡片标题描述）、`colorPicker.*`（颜色选择器工具页）、`lightbox.*`、`about.*`。

### 5.8 关于页（`src/views/AboutView.vue`）

- 静态介绍 + 依赖/目录结构表格（`el-table`），文案全部走 i18n。
- **「开源借鉴」卡片**：OKLCH 色域可视化（P3 / REC 2020 边界线 + 色域回退）参考了 MIT 协议的 [oklch-picker](https://github.com/evilmartians/oklch-picker)；链接在新标签页打开，参考仓库本身已 gitignore 且在 ESLint 中忽略（`eslint.config.ts`）。

### 5.9 颜色选择器工具页（`src/views/card/color-picker.vue`）

- 路由 `/card/color-picker`（懒加载），由工作台的「打开」按钮 / ColorCard「更多 → 在颜色选择器中打开」进入；页面左右两列 = 3:1，中间 16px gap；窄于 1100px 时单列，顺序为 **模式选择 → 取色器（二维图区域 + 多滑块区域，两个区域末尾各有一个小「显示颜色」；RGB / CMYK 只有多滑块区域的 1 个）→ 颜色转换 → 配色助手 → 历史记录 → 调色板**（用 `display: contents` + `order` 实现，宽屏不变）。单列时 `.picker-layout` 的 flex 列必须显式 `align-items: stretch`：宽屏 grid 的 `align-items: start` 会沿用到 flex 列，导致子项按内容宽度收缩（颜色转换面板只剩 1/4 宽、滑块轨道宽度为 0 只露出圆形拇指且拖动会把值设成 0）。
- **踩坑（已修，勿回退）**：`.picker-editor` 曾固定 `min-height: 220px`；现在改为 `min-height: 0`，高度由取色器内容自然撑开，不会留下固定留白。
- 页面状态：`rgb`（0-255）+ `alpha`（0-100，界面文案「不透明度」）+ `mode` + `axes`（各模式的竖向滑块 / 横轴 / 纵轴设置）+ `gamut`（OKLCH 超色域信息）；子组件通过 `update:rgb` / `update:alpha` / `update:axes` / `update:gamut` 回写，页面统一 `normalizeRgb` / clamp。
- **模式下拉**（`SelectMenu.vue`）：7 项 RGB / HSL / HWB / LAB / OKLCH / CMYK / YCbCr；触发框与选项的竖向 padding 均为 6px（横向 12px）；弹层 8px 圆角 + 阴影 + 0.18s 进出动画；slate/gray 状态色、gray-200 分隔线；accent-60 的 4×16px 胶囊指示器**不跟随鼠标悬浮，只有用户点击某个选项后才以 0.25s 滑到该项**（菜单延迟 0.25s 收起，让移动动画可见）；选中项左侧 padding 0 保证文字不缩进；支持点外 / Esc / ↑↓ / Enter。
- **统一取色器**（`ModeColorPicker.vue`，页面唯一的取色入口）：7 种模式全部实现；旧的 `RgbEditor.vue` / `HslEditor.vue` 与「该模式暂未实现」占位已删除。**两个区域同时出现**（「滑块和二维图合并」= 两种操作方式都保留）：二维色板模式（HSL / HWB / LAB / OKLCH / YCbCr）先显示 **二维图区域**（二维色板 + 右侧竖向滑块 + 横向不透明度），再显示 **多滑块区域**（全部分量 + 不透明度的横向滑块 + 手动输入）；滑块在上的模式（RGB / CMYK）只显示多滑块区域（3 / 4 行分量 + 不透明度）。多滑块区域的每行都是渐变轨道 + 数字输入框 + 标签，但二维色板模式的不透明度行没有数字输入框（数字输入统一由 `ManualInputs` 提供）；RGB / CMYK 不渲染 `ManualInputs`（滑块行已自带输入框）。两个区域都有加粗标题——「二维色板」（标题旁显示当前横轴 / 纵轴 / 滑块分量）与「滑块」；最下面仍是「控制坐标轴」（仅二维色板模式）。
- **二维图区域**（`ColorPanel.vue` + `VerticalChannelSlider.vue` + `OpacitySlider.vue`）：二维色板宽度撑满内容列，高度 `clamp(240px, 42vh, 400px)`（≤1100px 时 260px）；canvas 按 `devicePixelRatio` 放大 backing store 逐像素绘制，用 `requestAnimationFrame` 合并重绘、`ResizeObserver` 监听尺寸。支持指针拖拽 + 方向键（Shift ×10）/ Home / End 调整横轴 / 纵轴分量，拇指被夹在面板内。右侧是 **24px 宽的竖向滑块**，对应坐标轴设置里的「滑块」分量（顶部 = 最小值、底部 = 最大值；支持指针拖动、↑↓（Shift ×10）、Home / End；高度随二维色板拉伸）。二维色板下方是 **横向不透明度滑块**（标签「不透明度」，同色透明→不透明轨道叠 8px 棋盘格）；它与多滑块区域的不透明度行共用同一份 `alpha`，任意一处修改都会同步。窄屏时该区域末尾显示一个小的「显示颜色」。
- **滑块轨道**（`sliderTracks.ts`，由多滑块区的横向滑块与二维图右侧的竖向滑块共用）：轨道渐变用 32 个停靠点生成，每个通道的轨道用其它分量的**参考基准**（`sliderBase`）构建：RGB / CMYK 其它分量取当前值（原有 RGB 逻辑）；HSL 色相 = 饱和 / l=50 参考、HSL 亮度 = `hsl(0, 0, L)`、HSL 饱和度 = `hsl(0, S, 50)`；HWB 色相 = 纯色相、HWB 白/黑度 = `h=0` 且另一通道取 0；LAB l = a/b 中性、LAB a/b = `l=50`；YCbCr 其它通道取 128 中性值；OKLCH 色相 = `l=60, c=0.12`、OKLCH 彩度 = `l=60, h=0`、OKLCH 亮度 = `c=0, h=0`。横向轨道用 `linear-gradient(to right, …)`、竖向轨道用 `linear-gradient(to bottom, …)`，都由同一组 `channelTrackColors()` / `channelTrackMarkers()` 生成。多滑块区域最后一行是不透明度；两处不透明度轨道都使用 `alphaTrackBackground()`（同色透明→不透明渐变叠 8px 棋盘格）。
- **控制坐标轴**（`AxisControls.vue`，仅二维色板模式）：三个下拉分别切换**竖向滑块** / 横轴 / 纵轴对应的分量；选到已被其它位置占用的分量时**自动交换**两个位置，保证三者互不相同；「重置坐标轴」恢复该模式默认值；把「滑块」改成其它分量后，二维图右侧的竖向滑块会立即改绑到该分量。设置随 `my-designer:color-picker` 持久化（payload 增加 `axes`，key 不变；旧数据没有 `axes` 时回退默认）并在刷新后恢复；非法持久化值会回退默认（`sanitizeAxisSettings` / `sanitizeAxisSetting`）。
- **OKLCH 色域可视化**（仅 OKLCH）：二维色板逐像素判定 sRGB，超出 sRGB 的像素画**白色**（`#ffffff`），并画出 Display P3 / REC 2020 两条边界线（1 CSS px，附近有跟随线方向的 `Display P3` / `REC 2020` 文字标签；标签锚点用 PCA 估计线方向并夹在面板内）。横向与竖向滑块的轨道中不可显示的停靠点都画白色；色相轨道每 60° 有实线刻度、可显示 ↔ 不可显示边界用虚线标出（横向轨道上的虚线是竖线，竖向轨道上的虚线是横线；不透明度轨道不受影响）。宽屏下选中超色域颜色时，右栏「选择颜色」分裂为 2~3 张卡；点「回退」会把当前颜色改为映射后的回退色，并重置取色器的本地值，使结果卡恢复为单张。
- **「选择颜色」**（`SelectColorSection.vue` + `DisplayColor.vue`）：**仅宽屏**，位于右栏；未超出 sRGB 时是 1 张 64×64 棋盘格卡（带 1px `--color-slate-300` 描边）。OKLCH 选中超出 sRGB 的颜色时分裂为 2~3 张：① 虚线边框的「超出 sRGB 色域」说明卡（含原因说明）；② 可显示的回退颜色卡（色域映射 = CSS Color 4 降低彩度）+「回退」按钮（点击把当前颜色改为回退色）；③ 浏览器实际显示卡（用原始 `oklch()` CSS 让浏览器裁剪；与回退色相同时不显示）。**窄屏（≤1100px）**右栏隐藏，改由取色器在**二维图区域末尾**与**多滑块区域末尾**各显示一个轻量「显示颜色」块（标签 `colorPicker.displayColor` + 64×64 `DisplayColor` 色卡，居右）：二维色板模式共 2 个，RGB / CMYK 只有 1 个。窄屏的这两个内联块**不包含**超色域说明 / 回退 / 浏览器实际显示卡与屏幕取色按钮（窄屏版式的有意取舍）。
- **从屏幕中选取颜色**：按钮属于 `SelectColorSection.vue`（在「选择颜色」卡片下方），使用 `EyeDropper` API 取色（取到的 RGB 写入当前颜色、不透明度设为 100）；因此只在**宽屏右栏**可用（窄屏内联的「显示颜色」块没有该按钮）。浏览器不支持时用 Element Plus **`ElMessage.error(...)`** 在页面顶部弹出错误提示（`duration: 4000`、`offset: 16`，API 与样式自动注入），文案固定为 **「当前浏览器不支持从屏幕选取颜色，请使用最新的 Edge / Chrome浏览器」**（i18n `colorPicker.eyedropperUnsupported`）。能力检测 / 错误提示在 `color-picker.vue`；按 Esc 取消取色时静默忽略。
- **右侧单位面板**（`ColorUnits.vue`）：卡片区上方有加粗标题「颜色转换」（与「选择颜色」标题同款）；8 种格式按 `formatColorEntries()` 展示；不透明度 = 100 时不带任何透明属性，< 100 时 rgb→`rgba()`、hex→8 位、hsl→`hsla()`、hwb/lab/oklch→`/ a`、cmyk/ycbcr→追加 `A: a`；点卡片或复制按钮复制并播放 CopyIcon「复制缩小 + 对勾写出」动画（**画勾 0.25s**，2s 后反向恢复）。
- **选择颜色结果卡**（`DisplayColor.vue`）：64×64、8px 圆角棋盘格卡片，带 1px `--color-slate-300` 描边（选纯白时也能看清边界）；可按 sRGB 颜色（`rgb` + `alpha`）或原始 CSS（`css`，如「浏览器实际显示」卡的 `oklch()`）渲染。它既是宽屏右栏「选择颜色」的结果卡，也是窄屏二维图区域 / 多滑块区域末尾「显示颜色」块里的色卡。
- **历史记录**（`ColorHistory.vue`）：左列「配色助手」下方；最多 40 条、最新在最前；相同颜色（RGB + 不透明度都相同）再次出现时移动到最前而不是新增第二条。保存时机为「停止操作 600ms」：页面用 `watch([rgb, alpha])` 做防抖，覆盖滑块松手、二维色板点击、数字输入框提交、EyeDropper 取色等所有改色路径；进入页面 / 深链接应用时不写入。色块 hover / 键盘聚焦时右上角出现删除按钮（`emit remove(index)`，页面用 `removeHistoryColor()` 删除并持久化，删除不触发 apply）。色块带 1px `--color-slate-300` 描边（内部颜色覆盖层会盖住 inset 阴影，白/浅色时必须用真实 border 才能看清边界）。
- **调色板**（`ColorPalette.vue`）：用户点「添加当前颜色」手动加入，不限量（重复颜色去重并移到最前）；**每页数量 = 当前实际列数 × `PALETTE_PAGE_ROWS`(3)**（用 ResizeObserver 读 `gridTemplateColumns` 测量列数；1440 宽 18 列 → 54 条/页，1024 → 51，768 → 36；测到列数前用 `PALETTE_PAGE_SIZE`(54) 兜底），列数变化后自动重新分页并夹紧页码；色块区域始终按 3 行高度预留（`.palette-body` min-height = 3×40 + 2×12 = 144px，网格 `align-content: start`），最后一页只剩 1 行时高度也不收缩，翻页器 y / 两侧箭头垂直中心保持稳定；新颜色插入最前并自动回到第 1 页；色块 hover/focus 时右上角出现删除按钮。色块带 1px `--color-slate-300` 描边（白/浅色也能看清边界）。网格外包 `.palette-body` 左右各留 44px gutter（<640px 为 40px），用于摆放两侧悬浮箭头且绝不覆盖色块。
- **悬浮翻页器**（`ColorPager.vue` + `ColorPalette.vue`）：常驻触发器显示「第 x / y 页」，悬浮/聚焦时上方弹出页面选择器（只包含快速选页条：最多 5 个页码、含当前页、两端各一个小箭头）；**只有当前选中页的页码点击后变 number 输入框**（Enter/blur 提交、Esc 取消），点未选中页码直接跳页、不出输入框。调色板两侧另有 32×32 悬浮不透明箭头（`rgb(13 13 13 / 0.5)` 背景 + `#E6E6E6` 圆角 SVG 箭头），在调色板区域移动鼠标时出现、静止约 2.3s（+0.18s 渐隐）或离开区域后隐藏，指针停在箭头上保持可见；页面选择器弹层区域（`[data-color-pager-popover]`）不算触发区域；第一页不渲染左箭头、最后一页不渲染右箭头（不能翻就直接隐藏，不置灰）。
- **用户配置持久化**（`pickerState.ts`）：localStorage key 为 `my-designer:color-picker`，保存 `{ rgb, alpha, mode, axes, history, palette }`；页面初始化 `loadPickerSettings()` 自动恢复（颜色 / 不透明度 / 模式 / 坐标轴 / 历史 / 调色板），任何变化即时 `savePickerSettings()`。读写全部包 try/catch（隐私模式 / 存储禁用时退回默认值）；旧 payload 没有 `axes` 或坐标轴非法时回退默认值。
- **深链接**（`pickerState.ts` + `color-picker.vue`）：`/card/color-picker?color=E5254D&mode=hsl&alpha=80`；`color` 支持 hex（带不带 `#`、3/4/6/8 位）/ `rgb()` / `rgb()` 空格语法 / `hsl()` / `hsla()`，`mode` 只接受 7 种取色模式，`alpha` 会覆盖颜色文本自带的透明度。**带 query 进入时不自动加载本地保存的当前颜色**，而是应用 query 的颜色/模式并写回配置（「跳转的配色要修改配置的设置」），随后 `router.replace` 清空 query（之后刷新不会回到旧颜色）；不带 query 时才全量恢复本地配置。跳转地址用 `buildColorPickerLocation()` 生成，用法见 `use.md`。
- **配色助手**（`ColorAssistant.vue`）：标题下有提示「点击可获取颜色信息。」；**亮度来源跟随当前取色模式**：LAB / OKLCH 用各自的 L、YCbCr 用 Y（偏移按该通道取值范围的 5%，色板颜色会保持该亮度做色域映射，100% 档为白色、0% 档接近黑色），RGB / HSL / HWB / CMYK 仍沿用 HSL 亮度（由 `modes.ts` 的 `assistantLightnessPalettes()` 统一计算）；基于亮度 ±5% 偏移色板（夹紧到通道两端的重复项只保留最接近当前亮度的一条）与固定 5%-100% 色板，10 列网格、色块 40px / 圆角 8px、hover 暗 2% / 按下暗 6%；点击色块弹 Teleport 子菜单（同下拉框配色、11px 小字、8 种格式 + 复制，**左边界与色块左边界对齐**，点外 / Esc / 滚动 / resize 关闭）；子菜单每一行的 hover 区域都可点击复制，不只复制按钮。子菜单底部还有 gray-200 分割线 + 「保存到调色板」操作行：把该色块颜色（沿用当前不透明度）emit 给页面，用 `addPaletteColor()` 入调色板并关闭子菜单。
- 所有颜色转换与色域数学集中在 `color.ts`：rgb↔hsl、hex、hwb、lab（D65）、oklch、cmyk、ycbcr；线性 sRGB ↔ XYZ(D65) ↔ Display P3 / REC 2020 矩阵；`oklchGamutStatus`、`gamutMapOklchToRgb` / `gamutMapLabToRgb` / `gamutMapYcbcrToRgb`（保持亮度的色域映射）、`oklchToCss`、`lightnessSwatchesInRange` / `allLightnessSwatchesInRange`、`OutOfGamutInfo`。`__tests__/color.spec.ts` 覆盖换算往返、透明度规则、色域映射、色板数量/去重/颜色；`modes.ts`（模式定义 / 转换 / 滑块基准 / 坐标轴校验 / 配色助手亮度色板）由 `__tests__/modes.spec.ts` 覆盖（35 例）；`sliderTracks.ts`（32 停靠点轨道颜色 / 分隔线 / 不透明度轨道）由 `__tests__/sliderTracks.spec.ts` 覆盖（4 例）。
- 工具页私有组件都放在 `src/views/card/<工具>/` 下（见第 4 节），新增工具页时不要把工具专用组件放进 `src/components/`；例外是 `src/components/CardGrid.vue`（与具体业务无关的通用 Warp 网格）。颜色卡片 `ColorCard.vue` 是网页颜色页私有组件 `src/views/card/web-color/ColorCard.vue`（不再是全局通用组件）。

### 5.10 网页颜色页（`src/views/card/web-color.vue`）

- 路由 `/card/web-color`（懒加载）；入口是工作台第 2 张卡片「网页颜色」的「打开」按钮。页面已完整：顶部「显示模式：」选择框（CSS 命名色 / 网页安全色），右侧 CSS 模式胶囊搜索框或网页安全色 R/G/B 筛选行，下面是分区标题 + 结果计数 + 空状态，最后是 `ColorCard` 网格。
- **显示模式**（`SelectMenu.vue` + `webColorState.ts`）：CSS 命名色 / 网页安全色，默认 CSS 命名色；选择写入 `localStorage['my-designer:web-color']`（`{ mode }`）并在刷新后恢复；非法 / 损坏值回退默认（读写全部 try/catch）。
- **CSS 命名色模式**（`CSSColor.vue`）：数据来自 `src/data/colors.ts` 的 `toolCardDefinitions`（`ColorCardDefinition[]`，149 个唯一 `shorthand`；数组里只有 `aqua` 一个重复项，页面用 `Set` 按 `shorthand` 去重）；颜色名走 i18n `webColor.colors.css.<name>`（中英文各 149 个 key）。页面构建 `CssColorItem[]` 时把中英文名称都作为搜索索引，因此当前界面语言下也能用另一种语言搜索。
- **CSS 搜索**（`SearchBox.vue` + `colorSearch.ts`）：工具栏右侧胶囊搜索框；索引中文名 / 英文名 / 简写 / HEX，忽略大小写与 `#` 前缀，支持 3 位 HEX 展开（`#f00` 能搜到 `#ff0000`）与包含匹配；有内容时出现清空按钮，Esc 也可清空（焦点留在输入框）。无匹配显示空状态提示，不渲染空网格。
- **网页安全色模式**（`WebSafeColor.vue`）：`webSafeColors` 由 `colors.ts` 的 `generateWebSafeColors()` 用标准 `00 / 33 / 66 / 99 / cc / ff` 六档生成（216 个唯一色，`#000000` … `#ffffff`），渲染成不带简写 / 名称的 `ColorCard` 网格。工具栏是三个通道筛选（`WebSafeFilter.vue`）：R / G / B 各自可选「任意」或六档，三个条件同时生效；无筛选时「重置筛选」按钮禁用。
- **分区标题 / 计数 / 空状态**：分区标题（`webColor.cssSection` / `webColor.webSafeSection`）与结果计数（`webColor.count`，`role="status" aria-live="polite"`）同一行；结果为空时只显示空状态卡片。
- **卡片数据与布局**：两个列表组件（`CSSColor.vue` / `WebSafeColor.vue`）现在只负责渲染，不再自带 `max-w-[1440px] px-6 py-10` 容器（改由页面提供）；两者都复用 `CardGrid`，卡片宽度 / 列数 / 瀑布流 / 每列 `origin` 与工作台一致。`ColorCard` 的 `origin` / `transparent` 两个可选 prop 就是为这两个网格加的。
- **共享代码**：`colorSearch.ts`（搜索 / 筛选纯函数）、`webColorState.ts`（显示模式持久化）、`types.ts`（卡片数据类型），并由 `__tests__/colorSearch.spec.ts` 的 18 个单测覆盖（搜索 / 筛选 / 持久化）；页面组件本身没有 DOM 级测试。
- **`transparent` 特例**：`colors.ts` 里 `{ shorthand: 'transparent', color: 'transparent' }` 不是十六进制，页面把它的 `rgb` 置为 `{0,0,0}`、`alpha = 0` 并传 `transparent`；`ColorCard` 会只显示棋盘格、HEX 框显示 CSS 关键字 `transparent`、不显示「简写」复制框，且「更多」浮层隐藏 8 种格式列表与分割线，只保留「在颜色选择器中打开」。

---

## 6. 卡片机制（核心扩展点）

**数据流**：`src/data/tools.ts`（`ToolCardDefinition[]`）→ `HomeView` 用 `t()` 生成 `ToolCardData[]` → `ToolCardGrid`（薄封装）→ `CardGrid`（计算列宽 / 位置 / 每列 origin）→ `ToolCard`（渲染）。

**类型定义**（`src/data/tools.ts`）：

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

- `icon` 两种写法：① 只写 SVG path 的 `d`（组件自动包 `<svg viewBox="0 0 24 24" stroke="currentColor" …>`）；② 完整 `<svg>` 代码（以 `<svg` 开头，组件用 `v-html` 插入，尺寸固定 32×32）。
- `previews`：预览图地址数组；`tools.ts` 用两个 `import.meta.glob(..., { eager: true })`（`colorPicker*.png` 与 `webColor*.png`）加 `sortedPreviews()` 按文件名自然排序自动收集，因此把图片放进 `src/assets/tools/previews/` 并命名为 `colorPicker*.png` / `webColor*.png` 即可被对应卡片使用（新增其它卡片时仍可手写 `import` 数组）；可多张，灯箱内 `←` / `→` 切换。「网页颜色」卡片已有 `webColor1.png`，因此「每张卡片至少一张可用预览图」的单测已通过。
- `to`：「打开」按钮跳转的站内路径，必须在 `src/router/index.ts` 注册（当前只有 `color-picker` → `/card/color-picker`、`web-color` → `/card/web-color`）。
- 新增卡片四步：加预览图资源 → 在 `toolCardDefinitions` 追加定义（含 `to`）→ 在 `messages.ts` 补中英文案（`titleKey` / `descKey`）→ 新建 `src/views/card/<工具>.vue` 并在路由表注册与 `to` 一致的路径。
- **`ColorCard.vue`（`src/views/card/web-color/ColorCard.vue`）不是工作台卡片**：它是从 `Card.vue` 派生的颜色展示卡片（64×64 色块 + 可选名称 / 简写复制框 / HEX 复制框 + 「更多」转换菜单 + 「在颜色选择器中打开」）。props：`rgb`（必填）、`alpha`（默认 100）、`shorthand` / `name`（可选，不传即「不带简写」变体）、`mode`（默认 `rgb`，带进深链接）、`origin`（放大原点，由 `CardGrid` 传入）、`transparent`（透明色特例）。现在只用于 `/card/web-color` 两个网格（旧的 `/card/test-router-color` 测试页已不存在）。
- **`src/data/colors.ts`**：网页颜色数据（与工作台 `tools.ts` 无关，只是导出的 `toolCardDefinitions` 同名，两个文件都已使用该名字，引用时注意别名）。`ColorCardDefinition { titleKey, shorthand, color }` 里 `color` 是 CSS 颜色字符串（十六进制或 `'transparent'`）；数组按字母序排列、只有 `aqua` 一个重复项，展示层按 `shorthand` 去重（149 个唯一项，含 `transparent`；中英文各 149 个 i18n key）。另有 `webSafeColors: string[]`，是标准 216 色网页安全色（`00 / 33 / 66 / 99 / cc / ff` 组合，216 个唯一值），由 `web-color/__tests__/colorSearch.spec.ts` 覆盖（断言 216 色 + 搜索 / 筛选 / 持久化）。
- 详细步骤、示例与常见问题见根目录 **`use.md`**（该文件被 `.gitignore` 忽略，交接时请连同仓库一起拷贝给接手人）。

---

## 7. 设计令牌与样式约定（`src/assets/main.css`）

- `@theme static` 中定义（始终输出为 CSS 变量，组件手写 CSS 可用 `var()`）：
  - 主色：`--color-accent-50` ~ `--color-accent-100`，`oklch(50%~100% 0.2 25)`（50 最深，100 最浅）。
  - 文本：`--text-subtitle: 14px`（对应 `text-subtitle` 工具类）。
  - 手写 CSS 用到的默认调色板补充：`--color-slate-400/500`、`--color-gray-200/400`——Tailwind 只会为「工具类用到」的颜色输出 `:root` 变量，未被工具类使用的颜色必须在 `@theme static` 里显式声明，否则 `var()` 拿不到值。
- 全局字体：Inter / 系统字体栈；`html, body, #app { height: 100% }`。
- 组件样式以 `<style scoped>` 手写 CSS 为主，Tailwind 工具类用于布局与颜色；新增卡片/组件时优先复用 accent 变量与 8px 圆角、8px padding、16px 间距的既有节奏。

---

## 8. 路由

| 路径     | 组件                              | 说明   |
| -------- | --------------------------------- | ------ |
| `/`      | `HomeView`（同步引入）            | 工作台 |
| `/about` | `AboutView`（懒加载，单独 chunk） | 关于页 |
| `/card/color-picker` | `src/views/card/color-picker.vue`（懒加载） | 颜色选择器工具页（7 种模式、二维色板 + 滑块 + 手动输入、坐标轴控制、OKLCH 色域可视化、单位面板、配色助手、历史记录、调色板、EyeDropper、深链接） |
| `/card/web-color` | `src/views/card/web-color.vue`（懒加载） | 网页颜色页（显示模式、CSS 搜索、网页安全色 RGB 筛选、结果计数、空状态、ColorCard 网格） |

history 模式，`createWebHistory(import.meta.env.BASE_URL)`；GitHub Pages 上用 `404.html` 兜底子路径。

---

## 9. 接手检查清单

1. `git status` 确认未提交内容（见第 10 节）；`npm install`。
2. 跑一遍检查：
   ```bash
   npm run type-check
   npm run lint
   npm run test
   npm run build
   npm run dev   # 浏览器打开 http://localhost:5173
   npx prettier --check src/
   ```
   当前预期（本轮已实测）：`type-check` / `lint` / `build` 通过；`npm run test` **7 个测试文件、107/107 全部通过**；`npx prettier --check src/` 通过。`npm run format` 只改 `src/`，纯文档改动不要跑。
3. 浏览器手动检查：
   - 工作台显示 **2 张卡片**「颜色预览」（3 张预览图）与「网页颜色」（1 张预览图）；悬浮后卡片放大、**描述最后一行下方**展开预览图，展开后的整体高度约为默认卡高的 **1.05 ~ 2.0 倍**（跟随预览图高度）；颜色预览卡的多张图可在面板内滚动；
   - 点击预览图 → 灯箱打开，`←/→` 切换、`Esc` 关闭、页面滚动恢复；
   - 点击「打开」→ 分别跳转到 `/card/color-picker` / `/card/web-color`，浏览器后退 / 顶部「工作台」可返回；悬浮展开后鼠标移开卡片能正常收起；
   - 颜色选择器（`/card/color-picker`）：
     - **模式下拉**：7 项（RGB / HSL / HWB / LAB / OKLCH / CMYK / YCbCr，无 HEX）；指示器只在点击选项后移动（0.25s），不跟随悬浮；7 种模式都能渲染完整取色器（不再有「未实现」占位）；
     - **布局**：RGB 3 行滑块、CMYK 4 行（每行 = 渐变轨道 + 数字输入框 + 标签，最后一行不透明度）；HSL / HWB / LAB / OKLCH / YCbCr 先显示二维图区域（二维色板 + 右侧竖向滑块 + 下方横向不透明度），再显示多滑块区域（全部分量行 + 不透明度 + 手动输入）；二维色板高度约 `clamp(240px, 42vh, 400px)`（窄屏 260px）；两个区域都有加粗标题（二维色板标题旁显示当前横轴 / 纵轴 / 滑块分量），最下面是「控制坐标轴」；
     - **滑块**：拖动任一横向分量滑块、竖向滑块或任一处不透明度滑块，数字输入 / 手动输入 / 右侧单位值 / 64×64 色卡都保持同步；两处不透明度共用同一份值；不透明度 < 100 时 HEX 变 8 位、YCbCr / CMYK 追加 `A:`；轨道渐变按「其它分量参考基准」规则显示（RGB / CMYK 取当前值），横 / 竖向轨道由同一份 `sliderTracks.ts` 生成；
     - **控制坐标轴**（5 种二维色板模式）：可切换竖向滑块 / 横轴 / 纵轴；选到已占用分量时自动交换；修改「滑块」分量后右侧竖向滑块立即改绑；「重置坐标轴」恢复默认；刷新后设置保留；手动改坏持久化数据后刷新回退默认；
     - **OKLCH**：二维色板把超出 sRGB 的像素画白，并显示 Display P3 / REC 2020 边界线与标签；横向与竖向滑块轨道都画白色不可显示段，色相轨道有 60° 实线刻度与色域边界虚线；宽屏下选中超色域颜色时右栏「选择颜色」变 2~3 张卡（虚线说明 + 带「回退」按钮的回退色卡 + 不同的「浏览器实际显示」卡），点「回退」后当前颜色改为映射色并恢复单卡；
     - **宽屏 / 窄屏**：1440 宽屏只有右栏 1 个「选择颜色」、编辑区内不显示色卡；1024 / 768 / 375 宽时单列，顺序为 模式选择 → 取色器（二维图区域 + 多滑块区域，两个区域末尾各有一个居右「显示颜色」，二维色板模式共 2 个、RGB / CMYK 1 个）→ 颜色转换 → 配色助手 → 历史记录 → 调色板；窄屏内联块不含超色域卡与屏幕取色按钮（有意取舍），无横向滚动条、滑块不会把值拖成 0；
     - 点单位卡片 / 复制按钮出现对勾动画（画勾 0.25s）、2s 后恢复；配色助手的色板跟随当前取色模式的亮度（LAB / OKLCH 用 L、YCbCr 用 Y，其它模式用 HSL；100% 档为白色、0% 档接近黑色），子菜单原行为不变（整行可复制、「保存到调色板」）；宽屏下「颜色转换」与「选择颜色」都有加粗标题，64×64 卡片有 1px 描边（白色时可见）；
     - **历史记录 / 调色板 / 翻页器**：历史（最多 40 条、去重、600ms 防抖、可删、刷新保留）与调色板（列数×3 分页、3 行预留、两侧箭头、仅当前页可输入页码）行为与上一版一致；
     - **从屏幕中选取颜色**：按钮只在宽屏右栏「选择颜色」区块内（窄屏内联「显示颜色」块没有）；正常浏览器可调用 EyeDropper（取消不报错）；把 `window.EyeDropper` 置空后点击，页面顶部出现 Element Plus `ElMessage` 错误提示（`.el-message--error`），文案为「当前浏览器不支持从屏幕选取颜色，请使用最新的 Edge / Chrome浏览器」，约 4s 自动消失；
     - **持久化 / 深链接**：改颜色 / 模式 / 坐标轴 / 历史 / 调色板后刷新，全部恢复；访问 `/card/color-picker?color=E5254D&mode=hsl&alpha=80` 时不加载旧颜色，而是应用 query 并写回配置，随后 URL query 被清空；ColorCard「更多 → 在颜色选择器中打开」按此行为工作；
   - 网页颜色页（`/card/web-color`）：标题「网页颜色」；默认 **CSS 命名色** 模式，胶囊搜索框可按中文名 / 英文名 / 简写 / HEX 搜索（忽略大小写与 `#`，`#f00` 可匹配 `#ff0000`，包含匹配），清空按钮与 Esc 可清空，结果计数更新、无匹配显示空状态；`transparent` 卡片只显示棋盘格、HEX 为 `transparent`、无简写框；切到 **网页安全色** 模式有 216 张色卡，R / G / B 三通道筛选可组合、「重置筛选」在无筛选时禁用；切换模式后刷新能恢复上次模式；两套网格卡片悬浮放大、贴边列向内容区内侧放大不溢出，控制台无报错；
   - 关于页：依赖 / 目录结构表格正常，新增「开源借鉴」卡片可跳转到 oklch-picker（MIT）；
   - 右上角语言选择框：默认「浏览器设置」高亮；切「English」后整页文案即时变英文（含卡片标题、按钮、预览 alt、Element Plus 组件文案，以及新增取色器 / 网页颜色文案），不刷新；刷新后语言保持；
   - 窗口缩到 1024 / 768 宽：卡片列数变化、无横向滚动条。
4. 若准备提交：仅在 `src/` 有改动时跑 `npm run format`，随后重跑第 2 步检查。把 `src/assets/tools/` 一并 `git add`（否则 CI 构建失败），并确认根目录的 `auto-imports.d.ts` / `components.d.ts` 已提交（CI 里 `vue-tsc` 类型检查依赖它们）；`use.md` 被 `.gitignore` 忽略，交接时请连同仓库手动拷贝给接手人。

---

## 10. 开发 / 调试提示

- 本机 Vite dev server 地址为 `http://localhost:5173`；历史上曾只监听 IPv6 `::1`，如 `127.0.0.1` 连不上请改用 `localhost`（端口被占用时可用 `http://localhost:5188`）。
- 本轮做浏览器自动化验证的方式（CDP 脚本在本机 `.tmp/verify/*.mjs`，共用客户端 `.tmp/cdp.mjs`；验证截图在 `.tmp/shots/`；均已被 gitignore，仓库里没有）：
  - 启动 headless Edge：`msedge.exe --headless=new --remote-debugging-port=9333 --user-data-dir=<临时目录> --window-size=1280,900 about:blank`；
  - Node（≥22，自带全局 `WebSocket`）通过 `http://127.0.0.1:9333/json/list` 拿到页面 `webSocketDebuggerUrl`，用 CDP 发 `Page.navigate` / `Input.dispatchMouseEvent` / `Page.captureScreenshot` / `Runtime.evaluate`；
  - 键盘交互用 `Input.dispatchKeyEvent`（Tab、Escape、方向键）；截图用 `Page.captureScreenshot`（`deviceScaleFactor: 2` 可得 @2x）。
- Windows 下偶发 Vite 文件监听 `EBUSY`（例如编辑器正占用 `use.md`），忽略即可；必要时重启 dev server。`vite.config.ts` 已把 `.tmp/**`、`.npm-cache/**` 加入 `server.watch.ignored`——headless 浏览器的 `--user-data-dir` 也会持续写文件，自动化验证时请放到系统临时目录（如 `$env:TEMP`），不要放进仓库 `.tmp/`，否则会触发整页 reload / EBUSY。
- 临时脚本不要留在仓库里（`.tmp/`、`.npm-cache/` 等已在 `.gitignore` 中，但更稳的是用完删除）。

---

## 11. 关键文件速查

| 需求                                   | 去哪改                                                            |
| -------------------------------------- | ----------------------------------------------------------------- |
| 加 / 改 / 删卡片                       | `src/data/tools.ts` + `src/i18n/messages.ts`（步骤见 `use.md`）   |
| 卡片外观、悬浮比例、预览面板、打开按钮 | `src/components/ToolCard.vue` + `src/components/Card.vue`（外壳 / 展开面板定位） |
| Warp 布局（列数、间距、断点、每列 origin） | `src/components/CardGrid.vue`（通用网格）+ `src/components/ToolCardGrid.vue`（工作台薄封装） |
| 灯箱行为                               | `src/components/PreviewLightbox.vue`                              |
| 工作台页头 / 空态                      | `src/views/HomeView.vue`                                          |
| 语言选择框 UI                          | `src/components/LanguageSelector.vue`                             |
| 语言偏好与持久化                       | `src/stores/locale.ts`                                            |
| 中英文文案                             | `src/i18n/messages.ts`                                            |
| 主色 / 间距 / 文本尺寸令牌             | `src/assets/main.css`                                             |
| 头部、导航、Element Plus locale        | `src/App.vue`                                                     |
| 路由                                   | `src/router/index.ts`                                             |
| 「打开」按钮跳转目标                   | `src/data/tools.ts` 的 `to` + `src/router/index.ts` 对应路由       |
| 颜色选择器工具页                       | `src/views/card/color-picker.vue` + `src/views/card/color-picker/` |
| 统一取色器 / 二维图区域 / 竖向滑块 / 横向不透明度 / 多滑块区 / 手动输入 / 坐标轴 | `color-picker/ModeColorPicker.vue` / `ColorPanel.vue` / `VerticalChannelSlider.vue` / `OpacitySlider.vue` / `ChannelSliders.vue` / `ManualInputs.vue` / `AxisControls.vue` |
| 滑块轨道渐变 / 分隔线（横 / 竖向共用） | `color-picker/sliderTracks.ts`（单测 `color-picker/__tests__/sliderTracks.spec.ts`） |
| 模式定义（分量 / 范围 / 布局 / 滑块基准 / 配色助手色板） | `color-picker/modes.ts`（单测 `color-picker/__tests__/modes.spec.ts`） |
| 颜色转换 / 格式化 / 色域数学 / 亮度色板 | `color-picker/color.ts`（单测 `color-picker/__tests__/color.spec.ts`） |
| 用户配置持久化 / 坐标轴 / 历史 / 调色板 / 深链接 query | `color-picker/pickerState.ts`（单测 `color-picker/__tests__/pickerState.spec.ts`） |
| 模式下拉 | `color-picker/SelectMenu.vue` |
| 「选择颜色」区块（宽屏右栏）/ 结果卡 / 色域回退 / 屏幕取色按钮 | `color-picker/SelectColorSection.vue` / `DisplayColor.vue`；EyeDropper 逻辑内联在 `color-picker.vue`（错误提示文案固定）；窄屏编辑区复用 `DisplayColor` 作为「显示颜色」 |
| 单位面板 / 复制动画 / 配色助手 | `color-picker/ColorUnits.vue` / `CopyIcon.vue` / `ColorAssistant.vue` |
| 历史记录 / 调色板 / 悬浮翻页 | `color-picker/ColorHistory.vue` / `ColorPalette.vue` / `ColorPager.vue` |
| 「在颜色选择器中打开」深链接 | `pickerState.ts` 的 `buildColorPickerLocation()` + `use.md` 的「通过应用跳转打开颜色选择器」 |
| 网页颜色页 / 显示模式 / 搜索 / RGB 筛选 | `src/views/card/web-color.vue` + `web-color/`（`SearchBox.vue` / `WebSafeFilter.vue` / `CSSColor.vue` / `WebSafeColor.vue`） |
| 网页颜色搜索 / 设置持久化 | `web-color/colorSearch.ts` + `web-color/webColorState.ts`（单测 `web-color/__tests__/colorSearch.spec.ts`） |
| 网页颜色数据（149 CSS 命名色 / 标准 216 色） | `src/data/colors.ts` |
| 网页颜色卡片（透明色、origin、更多菜单） | `src/views/card/web-color/ColorCard.vue`（仅网页颜色页） |
| 页面背景 / 外壳滚动露白                | `src/App.vue` 根容器（勿加 `h-full`）+ `src/assets/main.css` 的 body 背景 |
| Element Plus 按需引入 / 自动导入类型   | `vite.config.ts`；`auto-imports.d.ts`、`components.d.ts`（需提交） |
| 单元测试（运行 / 配置 / 用例）         | `vitest.config.ts`、`src/**/__tests__/`（`npm run test`）          |
| 部署（子路径、404 兜底）               | `vite.config.ts`（`DEPLOY_BASE`）+ `.github/workflows/deploy.yml` |
