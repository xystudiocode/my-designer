<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Minus, Plus, RefreshRight } from '@element-plus/icons-vue'
import { useCounterStore } from '@/stores/counter'

const counter = useCounterStore()
const { count, doubleCount } = storeToRefs(counter)

const projectName = ref('')

const stack = ['Vue 3', 'Vite', 'TypeScript', 'Vue Router', 'Pinia', 'Element Plus', 'Tailwind CSS']

const nextSteps = [
  { title: '新增页面', desc: '在 src/views 下创建组件，并在 src/router/index.ts 注册路由。' },
  { title: '新增状态模块', desc: '在 src/stores 下新建文件，使用 defineStore 导出 store。' },
  { title: '编写样式', desc: '直接使用 Tailwind 原子类；全局样式写在 src/assets/main.css。' },
]

function greet() {
  ElMessage.success(projectName.value ? `你好，${projectName.value}` : '你好，My Designer')
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-10">
    <section class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900">My Designer</h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        项目已初始化完成。当前页面用于验证技术栈集成是否正常，可直接在此基础上开发业务功能。
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <el-tag v-for="item in stack" :key="item" effect="plain" round>{{ item }}</el-tag>
      </div>
    </section>

    <div class="grid gap-6 md:grid-cols-2">
      <el-card shadow="never" class="rounded-xl!">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-700">Pinia 状态管理</span>
            <el-tag size="small" type="success" effect="plain">counter</el-tag>
          </div>
        </template>
        <p class="text-sm leading-6 text-slate-500">
          修改 store 中的 count，doubleCount 由 computed 派生。
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-4">
          <el-button-group>
            <el-button :icon="Minus" @click="counter.decrement()" />
            <el-button :icon="RefreshRight" @click="counter.reset()" />
            <el-button :icon="Plus" @click="counter.increment()" />
          </el-button-group>
          <div class="text-sm text-slate-600">
            count = <strong class="text-slate-900">{{ count }}</strong
            >，doubleCount = <strong class="text-slate-900">{{ doubleCount }}</strong>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="rounded-xl!">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-700">Element Plus 交互</span>
            <el-tag size="small" effect="plain">zh-cn</el-tag>
          </div>
        </template>
        <p class="text-sm leading-6 text-slate-500">组件与图标已全局注册，可直接在模板中使用。</p>
        <div class="mt-4 flex gap-3">
          <el-input v-model="projectName" placeholder="输入设计稿名称" clearable />
          <el-button type="primary" @click="greet">问候</el-button>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="mt-6 rounded-xl!">
      <template #header>
        <span class="text-sm font-medium text-slate-700">下一步</span>
      </template>
      <ul class="divide-y divide-slate-100">
        <li
          v-for="step in nextSteps"
          :key="step.title"
          class="flex gap-4 py-3 first:pt-0 last:pb-0"
        >
          <span class="w-20 shrink-0 text-sm font-medium text-slate-700">{{ step.title }}</span>
          <span class="text-sm leading-6 text-slate-500">{{ step.desc }}</span>
        </li>
      </ul>
    </el-card>
  </div>
</template>
