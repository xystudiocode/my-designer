<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import LanguageSelector from '@/components/LanguageSelector.vue'
import { useI18n } from '@/i18n'

const { t, locale } = useI18n()
const route = useRoute()

const navItems = computed(() => [
  { to: '/', label: t('nav.workspace') },
  { to: '/about', label: t('nav.about') },
])

/** Element Plus 自带文案（日期选择、分页等）跟随界面语言 */
const elementLocale = computed(() => (locale.value === 'zh-CN' ? zhCn : en))

/** 切换语言时同步 <html lang> 与标签页标题；只做响应式更新，不刷新页面 */
watchEffect(() => {
  document.documentElement.lang = locale.value
  document.title = t('app.documentTitle')
})

/** 当前路由对应的导航项为选中态；选中且悬浮时用 accent-75 加深反馈 */
function isActiveNav(to: string) {
  return route.path === to
}
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <div class="flex h-full min-h-screen flex-col bg-slate-50 text-slate-800">
      <header
        class="flex h-14 shrink-0 items-center border-b border-slate-200 px-6 justify-between bg-slate-100"
      >
        <div class="flex gap-8 items-center">
          <RouterLink to="/" class="flex items-center gap-2">
            <img src="./assets/images/my-designer.svg" />
            <div class="flex gap-2 items-center">
              <p class="text-base font-semibold text-slate-900">{{ t('app.title') }}</p>
              <p class="text-gray-500 text-subtitle">{{ t('app.subtitle') }}</p>
            </div>
          </RouterLink>

          <nav class="flex items-center gap-1 text-sm">
            <RouterLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="rounded-md px-3 py-1.5 transition-colors"
              :class="
                isActiveNav(item.to)
                  ? 'bg-accent-80 font-medium text-white hover:bg-accent-75 active:bg-accent-70'
                  : 'text-slate-600 hover:bg-accent-95 hover:text-slate-900 active:bg-accent-90 active:text-white'
              "
            >
              {{ item.label }}
            </RouterLink>
          </nav>
        </div>

        <!-- 语言切换：位于标题栏右侧 -->
        <LanguageSelector />
      </header>

      <main class="flex-1">
        <RouterView />
      </main>
    </div>
  </el-config-provider>
</template>
