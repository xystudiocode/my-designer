<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const dependencies = computed(() => [
  { name: 'vue', usage: t('about.dep.vue') },
  { name: 'vue-router', usage: t('about.dep.vueRouter') },
  { name: 'pinia', usage: t('about.dep.pinia') },
  { name: 'element-plus', usage: t('about.dep.elementPlus') },
  { name: 'vite', usage: t('about.dep.vite') },
  { name: 'tailwindcss', usage: t('about.dep.tailwind') },
  { name: 'iconify', usage: t('about.dep.iconify') },
  { name: 'prettier', usage: t('about.dep.prettier') },
  { name: 'oxlint', usage: t('about.dep.oxlint') },
  { name: 'eslint', usage: t('about.dep.eslint') },
])

const openSource = computed(() => [
  {
    name: 'oklch-picker (https://github.com/evilmartians/oklch-picker)',
    usage: t('about.op.oklch-picker'),
  },
])
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-10">
    <h1 class="text-2xl font-semibold tracking-tight text-slate-900">{{ t('about.title') }}</h1>
    <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{{ t('about.intro') }}</p>

    <el-card shadow="never" class="mt-6 rounded-xl!">
      <template #header>
        <span class="text-sm font-medium text-slate-700">{{ t('about.stack') }}</span>
      </template>
      <el-table :data="dependencies" style="width: 100%">
        <el-table-column prop="name" :label="t('about.col.dependency')" width="200" />
        <el-table-column prop="usage" :label="t('about.col.usage')" />
      </el-table>
    </el-card>

    <!-- 开源借鉴说明：OKLCH 色域可视化参考了 MIT 协议的 oklch-picker -->
    <el-card shadow="never" class="mt-6 rounded-xl!">
      <template #header>
        <span class="text-sm font-medium text-slate-700">{{ t('about.credits') }}</span>
      </template>

      <el-table :data="openSource" style="width: 100%" class="mb-4">
        <el-table-column prop="name" :label="t('about.col.dependency')" width="200" />
        <el-table-column prop="usage" :label="t('about.col.usage')" />
      </el-table>
      <p class="m-0 text-sm leading-6 text-slate-600">
        {{ t('about.op.oklch-picker') }}
        <a
          class="ml-1 text-accent-60 underline-offset-2 hover:underline"
          href="https://github.com/evilmartians/oklch-picker"
          target="_blank"
          rel="noreferrer"
          >oklch-picker</a
        >
      </p>
    </el-card>
  </div>
</template>
