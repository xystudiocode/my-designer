<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

const navItems = [
  { to: '/', label: '工作台' },
  { to: '/about', label: '关于' },
]
</script>

<template>
  <div class="flex h-full min-h-screen flex-col bg-slate-50 text-slate-800">
    <header class="flex h-14 shrink-0 items-center gap-8 border-b border-slate-200 bg-white px-6">
      <RouterLink to="/" class="flex items-center gap-2 text-base font-semibold text-slate-900">
        <span class="grid size-7 place-items-center rounded-md bg-indigo-500 text-sm text-white">
          D
        </span>
        My Designer
      </RouterLink>

      <nav class="flex items-center gap-1 text-sm">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-md px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          exact-active-class="bg-slate-100 font-medium text-slate-900"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </header>

    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>
