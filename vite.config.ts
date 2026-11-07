import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { githubPagesSpa } from '@sctg/vite-plugin-github-pages-spa'

// https://vite.dev/config/
export default defineConfig({
  // 部署到 GitHub Pages 等项目子路径时，通过 DEPLOY_BASE 覆盖（例如 /my-designer/）
  base: process.env.DEPLOY_BASE || '/',
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    // Element Plus 按需引入：模板里的 <el-*> 组件与 ElMessage 等 API 用多少打包多少
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: 'auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'components.d.ts',
    }),
    githubPagesSpa(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    watch: {
      // .tmp / .npm-cache 是本地验证 / 浏览器 profile / 离线依赖的临时目录（已在 .gitignore）：
      // Vite 默认会递归监听，headless 浏览器持续写 profile 时会产生整页 reload 与 EBUSY，这里显式忽略
      ignored: ['**/.tmp/**', '**/.npm-cache/**'],
    },
  },
})
