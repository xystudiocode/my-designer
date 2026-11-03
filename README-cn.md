简体中文 | [English](./README.md)

# my-designer

Useful design tools. / 一些有用的设计工具

基于官方 `create-vue` 模板初始化的 Vue 3 前端项目，已集成常用生态依赖，可直接开始业务开发。

## 技术栈

| 依赖                       | 说明                                                |
| -------------------------- | --------------------------------------------------- |
| Vue 3                      | 组合式 API + `<script setup>` + TypeScript          |
| Vite                       | 开发服务器与生产构建                                |
| Vue Router                 | SPA 路由（history 模式）                            |
| Pinia                      | 全局状态管理                                        |
| Element Plus               | UI 组件库，全局注册、中文 locale、全量图标          |
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
├── public/                 # 静态资源（原样拷贝）
├── src/
│   ├── assets/
│   │   └── main.css        # Tailwind 入口与全局样式
│   ├── components/         # 可复用组件
│   ├── router/index.ts     # 路由表
│   ├── stores/             # Pinia 状态模块
│   ├── views/              # 页面级组件
│   ├── App.vue             # 根组件 / 整体布局
│   └── main.ts             # 应用入口
├── env.d.ts                # vite 客户端类型
├── vite.config.ts          # Vite 配置（别名 @、Tailwind、Vue DevTools）
└── eslint.config.ts        # ESLint 扁平配置
```

## 约定说明

- **Element Plus** 为全量引入（`app.use(ElementPlus)`），上手成本最低。后续若关注包体积，可改用 `unplugin-vue-components` + `unplugin-auto-import` 做按需引入。
- **Tailwind CSS v4** 无需 `tailwind.config.js`，在 `src/assets/main.css` 中 `@import 'tailwindcss';` 即可，主题定制使用 `@theme` 块。
- **样式顺序**：`main.css`（含 Tailwind preflight）先于 Element Plus 样式引入，保证组件样式优先级。
- **别名**：`@` 指向 `src/`，由 `vite.config.ts` 与 `tsconfig.app.json` 共同配置。

## 推荐 IDE

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)（并禁用 Vetur）。
