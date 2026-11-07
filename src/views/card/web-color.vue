<script setup lang="ts">
/**
 * 网页颜色页：
 *
 * - 显示模式（CSS 命名色 / 网页安全色）用下拉选择，默认 CSS，选择写入 localStorage；
 * - CSS 命名色模式：胶囊搜索框，索引中英文颜色名 / 简写 / HEX；
 * - 网页安全色模式：R / G / B 三个通道分别可筛「任意」或六档网页安全色，三个条件同时生效；
 * - 两种模式共用 CardGrid 网格与 ColorCard 卡片；无匹配时显示空状态，不渲染空网格。
 *
 * 搜索与筛选都是 colorSearch.ts 里的纯函数，页面只负责组装数据与持久化。
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { messages } from '@/i18n/messages'
import { toolCardDefinitions, webSafeColors } from '@/data/colors'
import type { ColorFormat, RgbColor } from './color-picker/color'
import SelectMenu from './color-picker/SelectMenu.vue'
import CSSColor from './web-color/CSSColor.vue'
import SearchBox from './web-color/SearchBox.vue'
import WebSafeColor from './web-color/WebSafeColor.vue'
import WebSafeFilter from './web-color/WebSafeFilter.vue'
import {
  defaultWebSafeFilter,
  filterBySearch,
  filterWebSafeColors,
  type WebSafeRgbFilter,
} from './web-color/colorSearch'
import type { CssColorItem, WebSafeColorItem } from './web-color/types'
import {
  isWebColorMode,
  loadWebColorSettings,
  saveWebColorSettings,
  type WebColorMode,
} from './web-color/webColorState'

const { t } = useI18n()

/** 显示模式：默认 CSS 命名色，并恢复上次保存的选择 */
const mode = ref<WebColorMode>(loadWebColorSettings().mode)

/** CSS 命名色模式的搜索词 */
const searchQuery = ref('')

/** 网页安全色模式的 RGB 筛选条件（三通道同时生效） */
const rgbFilter = ref<WebSafeRgbFilter>(defaultWebSafeFilter())

const isCssMode = computed(() => mode.value === 'css')

/** 模式选择下拉的选项 */
const modeOptions = computed(() => [
  { value: 'css', label: t('webColor.modeCss') },
  { value: 'websafe', label: t('webColor.modeWebSafe') },
])

/** 十六进制色值（#rgb / #rrggbb）转 sRGB 0-255 */
function hexToRgb(hex: string): RgbColor {
  const value = hex.replace('#', '').trim()
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value
  const int = Number.parseInt(full, 16)
  return {
    r: (int >> 16) & 0xff,
    g: (int >> 8) & 0xff,
    b: int & 0xff,
  }
}

/**
 * CSS 命名色完整列表：按简写去重（数据里有 aqua 等重复项），
 * 同时索引中文名 / 英文名 / 简写 / HEX（两种语言的名称都保留，切换语言后都能搜到）。
 */
const cssItems = computed<CssColorItem[]>(() => {
  const seen = new Set<string>()
  const items: CssColorItem[] = []
  for (const def of toolCardDefinitions) {
    if (!def.color || seen.has(def.shorthand)) continue
    seen.add(def.shorthand)
    const transparent = def.color === 'transparent'
    items.push({
      shorthand: def.shorthand,
      name: t(def.titleKey),
      names: [messages['zh-CN'][def.titleKey], messages.en[def.titleKey]],
      hex: def.color,
      rgb: transparent ? { r: 0, g: 0, b: 0 } : hexToRgb(def.color),
      alpha: transparent ? 0 : 100,
      mode: 'rgb' as ColorFormat,
      transparent,
    })
  }
  return items
})

/** CSS 命名色：按搜索词过滤（中英文名 / 简写 / HEX） */
const filteredCssItems = computed(() => filterBySearch(cssItems.value, searchQuery.value))

/** 网页安全色完整列表（216 个） */
const webSafeItems = computed<WebSafeColorItem[]>(() =>
  webSafeColors.map((hex) => ({ hex, rgb: hexToRgb(hex) })),
)

/** 网页安全色：按 R / G / B 三通道筛选 */
const filteredWebSafeItems = computed(() =>
  filterWebSafeColors(webSafeItems.value, rgbFilter.value),
)

/** 当前模式下的结果数量 */
const resultCount = computed(() =>
  isCssMode.value ? filteredCssItems.value.length : filteredWebSafeItems.value.length,
)

/** 分区标题：CSS 命名颜色 / 网页安全色 */
const sectionTitle = computed(() =>
  isCssMode.value ? t('webColor.cssSection') : t('webColor.webSafeSection'),
)

function selectMode(value: string) {
  if (!isWebColorMode(value)) return
  mode.value = value
}

// 切换显示模式后立即持久化，刷新页面时恢复上次选择
watch(mode, (value) => saveWebColorSettings({ mode: value }))
</script>

<template>
  <div class="mx-auto w-full max-w-[1440px] px-6 py-10">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900">{{ t('webColor.title') }}</h1>

    <!-- 工具栏：显示模式 +（CSS）搜索框 /（网页安全色）RGB 筛选 -->
    <div class="web-color__toolbar">
      <div class="web-color__mode">
        <span class="web-color__label">{{ t('webColor.mode') }}</span>
        <div class="web-color__mode-select">
          <SelectMenu
            :model-value="mode"
            :options="modeOptions"
            :label="t('webColor.mode')"
            @update:model-value="selectMode"
          />
        </div>
      </div>

      <div v-if="isCssMode" class="web-color__search">
        <SearchBox v-model="searchQuery" />
      </div>
      <div v-else class="web-color__filter">
        <WebSafeFilter v-model="rgbFilter" />
      </div>
    </div>

    <section class="web-color__results">
      <div class="web-color__section-head">
        <h2 class="web-color__section-title">{{ sectionTitle }}</h2>
        <!-- 结果数量放在 aria-live 区域：筛选 / 搜索变化时读屏会播报 -->
        <p class="web-color__count" role="status" aria-live="polite">
          {{ t('webColor.count', { count: resultCount }) }}
        </p>
      </div>

      <p v-if="resultCount === 0" class="web-color__empty">{{ t('webColor.noResults') }}</p>
      <div v-else class="web-color__grid">
        <CSSColor v-if="isCssMode" :items="filteredCssItems" />
        <WebSafeColor v-else :items="filteredWebSafeItems" />
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 工具栏：宽屏一行，窄屏自动换行；搜索框 / 筛选靠右对齐 */
.web-color__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  margin-top: 24px;
}

/* 极窄屏时「显示模式」标签与下拉允许换行，避免撑出横向滚动条 */
.web-color__mode {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.web-color__label {
  flex: none;
  color: #334155;
  font-size: 14px;
  line-height: 1.4;
}

.web-color__mode-select {
  width: 180px;
  max-width: 100%;
}

.web-color__search {
  flex: 1 1 260px;
  max-width: 360px;
  margin-left: auto;
}

.web-color__filter {
  margin-left: auto;
}

/* 分区标题 + 结果计数同一行，数量靠右 */
.web-color__results {
  margin-top: 24px;
}

.web-color__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
}

.web-color__section-title {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

.web-color__count {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.4;
}

.web-color__grid {
  margin-top: 16px;
}

/* 空结果：与颜色选择器的占位块同款浅灰卡片 */
.web-color__empty {
  margin: 16px 0 0;
  padding: 48px 24px;
  border-radius: 8px;
  background-color: #f1f5f9;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
}

/* 窄屏：模式一行，搜索 / 筛选独占一行，避免横向滚动 */
@media (max-width: 720px) {
  .web-color__toolbar {
    gap: 12px;
  }

  .web-color__search,
  .web-color__filter {
    flex: 1 1 100%;
    width: 100%;
    max-width: none;
    margin-left: 0;
  }
}
</style>
