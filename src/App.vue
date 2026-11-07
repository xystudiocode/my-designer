<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import LanguageSelector from '@/components/LanguageSelector.vue'
import { useI18n } from '@/i18n'
import { Icon } from '@iconify/vue'

const githubUrl = 'https://github.com/xystudiocode/my-designer' // 换成你的主页

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
    <div class="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <!--
        标题栏在窄屏（<640px）允许换行：左侧「Logo + 应用名 + 导航」与右侧语言选择器分两行，
        避免语言选择器把页面撑出横向滚动条（小屏单列布局下尤其明显）。
      -->
      <header
        class="flex min-h-14 shrink-0 flex-wrap items-center gap-y-1 border-b border-slate-200 bg-slate-100 px-4 py-1.5 sm:gap-y-0 sm:px-6 sm:py-0 justify-between"
      >
        <div class="flex min-w-0 items-center gap-4 sm:gap-8">
          <RouterLink to="/" class="flex min-w-0 items-center gap-2">
            <img src="./assets/images/my-designer.svg" class="h-8 w-8 shrink-0" />
            <div class="flex min-w-0 items-center gap-2">
              <p class="truncate text-base font-semibold text-slate-900">{{ t('app.title') }}</p>
              <p class="hidden text-gray-500 text-subtitle sm:block">{{ t('app.subtitle') }}</p>
            </div>
          </RouterLink>

          <nav class="flex shrink-0 items-center gap-1 text-sm">
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

        <!-- 语言切换：位于标题栏右侧（窄屏换行后仍靠右） -->
        <div class="ml-auto flex min-w-0 items-center gap-4">
          <LanguageSelector />
            <a
              :href="githubUrl"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              class="inline-flex items-center text-slate-500 transition-colors hover:text-slate-700 active:text-slate-950"
            >
              <Icon icon="mdi:github" width="24" height="24" />
            </a>
            <!-- Tooltip：默认在图标上方 -->
        </div>
      </header>

      <main class="flex-1">
        <RouterView />
      </main>
      <footer class="flex justify-center items-center text-slate-500">{{ t('about.copyright') }}</footer>
    </div>
  </el-config-provider>
</template>
