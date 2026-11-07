<script setup lang="ts">
import { useI18n } from '@/i18n'

const { t } = useI18n()
</script>

<template>
  <div
    class="flex flex-col h-screen items-center justify-start mx-auto w-full max-w-5xl px-6 py-10 mt-6"
  >
    <h1 class="text-6xl font-bold mb-6">404</h1>
    <h2 class="text-2xl font-semibold mb-4">{{ t('404.title') }}</h2>
    <p>{{ t('404.desc') }}</p>

    <RouterLink class="button mt-4" to="/">{{ t('404.back') }}</RouterLink>
  </div>
</template>

<style scoped>
/* 按钮：padding 8px、4px 圆角；accent-60 / 悬浮 accent-70 / 按下 accent-55 */
.button {
  flex: 0 0 auto;
  padding: 12px 32px;
  border: 0;
  border-radius: 8px;
  background-color: var(--color-accent-60);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease;

  font-size: large;
}

.button:hover {
  background-color: var(--color-accent-70);
}

.button:active {
  background-color: var(--color-accent-55);
}
</style>
