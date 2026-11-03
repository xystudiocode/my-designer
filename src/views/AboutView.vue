<script setup lang="ts">
const dependencies = [
  { name: 'vue', usage: '核心框架，组合式 API + setup 语法' },
  { name: 'vue-router', usage: 'SPA 路由，history 模式' },
  { name: 'pinia', usage: '全局状态管理，stores 目录' },
  { name: 'element-plus', usage: 'UI 组件库，已全局注册并设置中文 locale' },
  { name: 'tailwindcss', usage: '原子化 CSS，经 @tailwindcss/vite 插件接入' },
]

const structure = [
  { path: 'src/main.ts', usage: '应用入口：注册 Pinia、Router、Element Plus' },
  { path: 'src/App.vue', usage: '根组件与整体布局' },
  { path: 'src/router/index.ts', usage: '路由表' },
  { path: 'src/stores/', usage: 'Pinia 状态模块' },
  { path: 'src/views/', usage: '页面级组件' },
  { path: 'src/components/', usage: '可复用组件' },
  { path: 'src/assets/main.css', usage: 'Tailwind 入口与全局样式' },
]
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-10">
    <h1 class="text-2xl font-semibold tracking-tight text-slate-900">关于本项目</h1>
    <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
      由 create-vue 官方模板初始化，并按需集成了常用生态依赖。
    </p>

    <el-card shadow="never" class="mt-6 rounded-xl!">
      <template #header>
        <span class="text-sm font-medium text-slate-700">技术栈</span>
      </template>
      <el-table :data="dependencies" style="width: 100%">
        <el-table-column prop="name" label="依赖" width="200" />
        <el-table-column prop="usage" label="用途" />
      </el-table>
    </el-card>

    <el-card shadow="never" class="mt-6 rounded-xl!">
      <template #header>
        <span class="text-sm font-medium text-slate-700">目录结构</span>
      </template>
      <el-table :data="structure" style="width: 100%">
        <el-table-column prop="path" label="路径" width="220" />
        <el-table-column prop="usage" label="说明" />
      </el-table>
    </el-card>
  </div>
</template>
