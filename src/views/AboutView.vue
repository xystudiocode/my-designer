<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const dependencies = computed(() => [
  { name: 'vue', usage: t('about.dep.vue') },
  { name: 'vue-router', usage: t('about.dep.vueRouter') },
  { name: 'pinia', usage: t('about.dep.pinia') },
  { name: 'element-plus', usage: t('about.dep.elementPlus') },
  { name: 'tailwindcss', usage: t('about.dep.tailwind') },
])

const structure = computed(() => [
  { path: 'src/main.ts', usage: t('about.src.main') },
  { path: 'src/App.vue', usage: t('about.src.app') },
  { path: 'src/router/index.ts', usage: t('about.src.router') },
  { path: 'src/stores/', usage: t('about.src.stores') },
  { path: 'src/views/', usage: t('about.src.views') },
  { path: 'src/components/', usage: t('about.src.components') },
  { path: 'src/assets/main.css', usage: t('about.src.css') },
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

    <el-card shadow="never" class="mt-6 rounded-xl!">
      <template #header>
        <span class="text-sm font-medium text-slate-700">{{ t('about.structure') }}</span>
      </template>
      <el-table :data="structure" style="width: 100%">
        <el-table-column prop="path" :label="t('about.col.path')" width="220" />
        <el-table-column prop="usage" :label="t('about.col.description')" />
      </el-table>
    </el-card>
  </div>
</template>
