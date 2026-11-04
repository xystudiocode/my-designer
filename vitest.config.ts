import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

// 单元测试独立配置：只做数据 / i18n 等纯逻辑校验，不启动浏览器环境。
// 组件级测试（需要 DOM）可后续补 jsdom + @vue/test-utils 后扩展 environment。
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.spec.ts'],
    environment: 'node',
  },
})
