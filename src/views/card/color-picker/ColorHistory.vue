<script setup lang="ts">
/**
 * 颜色历史记录（颜色选择器左列下方的一栏）。
 *
 * - 由父组件维护数据：最新在最前，最多 40 条，重复颜色只会保留一条并移到最前
 *   （去重 / 上限逻辑见 `pickerState.ts` 的 `pushHistory`，本组件只负责展示）。
 * - 40×40、8px 圆角的色块网格；透明颜色透出棋盘格。
 * - 点击色块 emit `apply`，由页面把该颜色重新载入选择器。
 * - 悬浮 / 键盘聚焦色块时，右上角出现圆形删除按钮，emit `remove(index)`（items 全局下标）。
 */
import { useI18n } from '@/i18n'
import { colorCss, formatColor } from './color'
import type { StoredColor } from './pickerState'

defineProps<{
  /** 历史记录：最新在最前 */
  items: StoredColor[]
}>()

const emit = defineEmits<{
  apply: [color: StoredColor]
  /** 要移除的颜色在 items 里的全局下标 */
  remove: [index: number]
}>()

const { t } = useI18n()

/** 色块的 title / aria-label：如「使用颜色 #3B82F6」 */
function colorLabel(color: StoredColor): string {
  return t('colorPicker.useColor', { color: formatColor(color, color.a, 'hex') })
}
</script>

<template>
  <section class="w-full min-w-0">
    <h2 class="text-[19px] leading-6 font-bold text-slate-900">
      {{ t('colorPicker.history') }}
    </h2>

    <p v-if="items.length === 0" class="mt-1 text-[13px] leading-[18px] text-slate-500">
      {{ t('colorPicker.historyEmpty') }}
    </p>

    <div v-else class="history-grid mt-2" role="group" :aria-label="t('colorPicker.history')">
      <div v-for="(item, index) in items" :key="index" class="history-cell">
        <button
          type="button"
          class="history-swatch"
          :title="colorLabel(item)"
          :aria-label="colorLabel(item)"
          @click="emit('apply', item)"
        >
          <span
            class="history-swatch__color"
            :style="{ backgroundColor: colorCss(item, item.a) }"
          />
        </button>
        <button
          type="button"
          class="history-remove"
          :aria-label="t('colorPicker.removeFromHistory')"
          @click.stop="emit('remove', index)"
        >
          <svg class="history-remove__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4.5 4.5l7 7M11.5 4.5l-7 7"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 40px 色块、12px 间距；容器变窄时自动换行 */
.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(0, 40px));
  justify-content: start;
  column-gap: 12px;
  row-gap: 12px;
}

.history-cell {
  position: relative;
  width: 40px;
  height: 40px;
}

.history-swatch {
  position: relative;
  display: block;
  width: 40px;
  height: 40px;
  padding: 0;
  overflow: hidden;
  /* 1px 描边：选白色 / 浅色时也能看清色块边界（与「选择颜色」区域一致） */
  border: 1px solid var(--color-slate-300);
  border-radius: 8px;
  background-color: #ffffff;
  background-image:
    linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
    linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
    linear-gradient(-45deg, transparent 75%, #cbd5e1 75%);
  background-size: 16px 16px;
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 0.08);
  cursor: pointer;
  transition: filter 0.12s ease;
}

/* 颜色覆盖层：带不透明度时透出下面的棋盘格 */
.history-swatch__color {
  position: absolute;
  inset: 0;
  display: block;
}

/* 悬浮暗 2%，按下暗 6% */
.history-swatch:hover {
  filter: brightness(0.98);
}

.history-swatch:active {
  filter: brightness(0.94);
}

.history-swatch:focus-visible {
  outline: 2px solid var(--color-slate-500);
  outline-offset: 2px;
}

/* 右上角删除按钮（与调色板同款）：hover / focus-within 时才出现 */
.history-remove {
  position: absolute;
  top: -5px;
  right: -5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background-color: #ffffff;
  color: var(--color-slate-500);
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.24);
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.9);
  transition:
    opacity 0.12s ease,
    transform 0.12s ease,
    visibility 0.12s ease,
    background-color 0.12s ease;
}

.history-cell:hover .history-remove,
.history-cell:focus-within .history-remove {
  opacity: 1;
  visibility: visible;
  transform: scale(1);
}

.history-remove:hover {
  background-color: var(--color-slate-100);
}

.history-remove:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 1px;
  opacity: 1;
  visibility: visible;
  transform: scale(1);
}

.history-remove__icon {
  display: block;
  width: 10px;
  height: 10px;
}

@media (prefers-reduced-motion: reduce) {
  .history-swatch,
  .history-remove {
    transition-duration: 0.001ms;
  }
}
</style>
