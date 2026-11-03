简体中文 | [English](./README.md)

# my-designer

Useful design tools. / 一些有用的设计工具

基于 Vue 3 + Vite + TypeScript 的设计工具前端。**工作台**（`/`）是一个 Warp 风格的卡片列表：
悬浮卡片会整体放大并展开图片预览，点击预览图可以查看大图；界面支持中英文切换，切换后立即生效、无需刷新页面。

## 功能

- **Warp 风格工具列表** —— 卡片横向排列、间隔 16px，下一个卡片放不下时自动换行；卡片按「最短列」填充，
  竖向间隔同样为 16px，不会按最高的卡片对齐。
- **卡片样式** —— 白底、8px 圆角、柔和阴影、8px 内边距；卡片默认无滚动条，内容不足时向下生长。
- **悬浮展开** —— 悬浮（或键盘聚焦）时卡片与子组件整体放大 1.25 倍，动画 0.25 秒；图片预览在卡片下方以 Wrap 布局展开
  （横竖间隔 16px、预览卡片约 480×270，窄屏自适应）。展开高度最高为卡片高度的 2 倍，预览图超出时在展开区域内竖向滚动。
- **预览大图** —— 点击任意预览图打开灯箱，支持 ← / → 切换、Esc 或关闭按钮退出。
- **按钮** —— 默认 `accent-60`、悬浮 `accent-70`、按下 `accent-55`；按钮位于卡片标题右侧，侧边塞不下时自动换行并占满整行。
- **中英双语** —— 全站文案（含 Element Plus locale）跟随语言切换，响应式更新、不刷新页面；语言偏好保存在
  `localStorage`，默认「跟随浏览器」。
- **设计令牌** —— accent 色板与文字尺寸在 `src/assets/main.css`（`@theme static`）中声明，组件样式通过 CSS 变量复用。

## 技术栈

| 依赖                       | 说明                                                |
| -------------------------- | --------------------------------------------------- |
| Vue 3                      | 组合式 API + `<script setup>` + TypeScript          |
| Vite                       | 开发服务器与生产构建                                |
| Vue Router                 | SPA 路由（history 模式）                            |
| Pinia                      | 全局状态管理                                        |
| Element Plus               | UI 组件库，全局注册、全量图标，中英文 locale 随界面切换 |
| Tailwind CSS               | 原子化 CSS，通过 `@tailwindcss/vite` 插件接入（v4） |
| ESLint / Oxlint / Prettier | 代码检查与格式化                                    |

## 快速开始

```sh
npm install
npm run dev
```

开发服务器默认运行在 <http://localhost:5173>。

## 可用脚本

| 命令                 | 说明                                    |
| -------------------- | --------------------------------------- |
| `npm run dev`        | 启动开发服务器（HMR）                   |
| `npm run build`      | 类型检查 + 生产构建，产物输出到 `dist/` |
| `npm run preview`    | 本地预览生产构建                        |
| `npm run type-check` | 仅执行 `vue-tsc` 类型检查               |
| `npm run lint`       | 运行 Oxlint + ESLint 并自动修复         |
| `npm run format`     | 使用 Prettier 格式化 `src/`             |

## 目录结构

```
.
├── public/                  # 静态资源（原样拷贝）
├── src/
│   ├── assets/
│   │   ├── main.css         # Tailwind 入口与 @theme 设计令牌
│   │   └── tools/previews/  # 演示用预览图（SVG 占位）
│   ├── components/
│   │   ├── LanguageSelector.vue  # 标题栏胶囊语言切换
│   │   ├── ToolCard.vue          # 悬浮展开的工具卡片
│   │   ├── ToolCardGrid.vue      # Warp（瀑布流）布局
│   │   └── PreviewLightbox.vue   # 预览大图灯箱
│   ├── data/tools.ts        # 卡片定义（title/desc 文案 key、icon、previews）
│   ├── i18n/                # 中英文案与响应式 t() 组合式函数
│   ├── router/index.ts      # 路由表
│   ├── stores/              # Pinia 状态模块（locale、counter）
│   ├── views/               # 页面级组件
│   ├── App.vue              # 根组件 / 整体布局
│   └── main.ts              # 应用入口
├── env.d.ts                 # vite 客户端类型
├── vite.config.ts           # Vite 配置（别名 @、Tailwind、Vue DevTools）
└── eslint.config.ts         # ESLint 扁平配置
```

## 约定说明

- **Element Plus** 为全量引入（`app.use(ElementPlus)`），上手成本最低。后续若关注包体积，可改用 `unplugin-vue-components` + `unplugin-auto-import` 做按需引入。
- **Tailwind CSS v4** 无需 `tailwind.config.js`，在 `src/assets/main.css` 中 `@import 'tailwindcss';` 即可，主题定制使用 `@theme` 块。
- **样式顺序**：`main.css`（含 Tailwind preflight）先于 Element Plus 样式引入，保证组件样式优先级。
- **别名**：`@` 指向 `src/`，由 `vite.config.ts` 与 `tsconfig.app.json` 共同配置。
- **国际化**：文案集中在 `src/i18n/messages.ts`（英文必须覆盖全部中文 key，由类型检查保证）；组件通过 `useI18n()` + `t('key')` 渲染，切换语言时响应式更新。

## 推荐 IDE

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)（并禁用 Vetur）。
