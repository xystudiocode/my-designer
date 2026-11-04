import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

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
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
