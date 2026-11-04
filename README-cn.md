简体中文 | [English](./README.md)

# my-designer

Useful design tools. / 一些有用的设计工具

基于 Vue 3 + Vite + TypeScript 的设计工具前端。**工作台**（`/`）是一个 Warp 风格的卡片列表：
悬浮卡片会整体放大并展开图片预览，点击预览图可以查看大图，点击「打开」进入对应工具页；界面支持中英文切换，切换后立即生效、无需刷新页面。

## 功能

- **颜色预览**: 支持 RGB / HSL 取色（RGB 三条滑块 + RGB/HSL 不透明度滑块、HSL 二维面板与手动输入）；实时换算 RGB、HEX、HSL、HWB、LAB、OKLCH、CMYK、YCbCr 八种格式并一键复制，还提供「配色助手」按亮度快速挑选同色系配色

## 技术栈

| 依赖                       | 说明                                                |
| -------------------------- | --------------------------------------------------- |
| Vue 3                      | 组合式 API + `<script setup>` + TypeScript          |
| Vite                       | 开发服务器与生产构建                                |
| Vue Router                 | SPA 路由（history 模式）                            |
| Pinia                      | 全局状态管理                                        |
| Element Plus               | UI 组件库，`unplugin-vue-components` 按需自动引入，中英文 locale 随界面切换 |
| Tailwind CSS               | 原子化 CSS，通过 `@tailwindcss/vite` 插件接入（v4） |
| Vitest                     | 单元测试（卡片数据、i18n 完整性）                   |
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
| `npm run test`       | 运行 Vitest 单元测试（一次性）          |
| `npm run test:watch` | Vitest 监听模式                         |
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
│   ├── data/
│   │   ├── tools.ts         # 卡片定义（title/desc 文案 key、icon、previews）
│   │   └── __tests__/       # 卡片数据单测
│   ├── i18n/                # 中英文案与响应式 t() 组合式函数（含完整性单测）
│   ├── router/index.ts      # 路由表
│   ├── stores/              # Pinia 状态模块（locale）
│   ├── views/               # 页面级组件（card/ 下为具体工具页）
│   ├── App.vue              # 根组件 / 整体布局
│   └── main.ts              # 应用入口（Pinia / Router；Element Plus 按需引入）
├── env.d.ts                 # vite 客户端类型
├── vite.config.ts           # Vite 配置（别名 @、Tailwind、Vue DevTools、EP 按需引入）
├── vitest.config.ts         # Vitest 单元测试配置
├── auto-imports.d.ts        # unplugin-auto-import 生成的类型（需提交）
├── components.d.ts          # unplugin-vue-components 生成的组件类型（需提交）
└── eslint.config.ts         # ESLint 扁平配置
```

## 约定说明

- **Element Plus** 通过 `unplugin-vue-components` + `unplugin-auto-import` 按需引入：模板里写 `<el-card>` 等组件、脚本里直接用 `ElMessage` 即可，样式与组件会按需打包；自动生成的 `components.d.ts` / `auto-imports.d.ts` 需一并提交，保证 `vue-tsc` 类型检查可用。
- **Tailwind CSS v4** 无需 `tailwind.config.js`，在 `src/assets/main.css` 中 `@import 'tailwindcss';` 即可，主题定制使用 `@theme` 块。
- **样式顺序**：入口先引入 `main.css`（含 Tailwind preflight），Element Plus 各组件样式在编译期按需注入，仍排在 Tailwind 之后，组件样式优先级不受影响。
- **别名**：`@` 指向 `src/`，由 `vite.config.ts` 与 `tsconfig.app.json` 共同配置。
- **国际化**：文案集中在 `src/i18n/messages.ts`（英文必须覆盖全部中文 key，由类型检查保证）；组件通过 `useI18n()` + `t('key')` 渲染，切换语言时响应式更新。
- **单元测试**：`npm run test` 运行 Vitest，覆盖卡片数据合法性与 i18n 中英文完整性；组件 / DOM 级测试尚未接入（需要 jsdom + `@vue/test-utils`）。

## 推荐 IDE

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)（并禁用 Vetur）。
