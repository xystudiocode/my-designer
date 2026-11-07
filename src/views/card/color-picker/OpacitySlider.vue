<script setup lang="ts">
/**
 * 二维图区域下方的横向不透明度滑块（多滑块区域里还有一行不透明度，两处同步）。
 *
 * 轨道 = 同色「透明 → 不透明」渐变叠 8px 棋盘格；range 本体透明，只露出白色圆形拇指。
 */
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import { useI18n } from '@/i18n'
import { clamp, type RgbColor } from './color'
import { alphaTrackBackground } from './sliderTracks'

const props = defineProps<{
  /** 当前显示色（模式空间映射到 sRGB 后的颜色） */
  rgb: RgbColor
  alpha: number
}>()

const emit = defineEmits<{
  'update:alpha': [alpha: number]
}>()

const { t } = useI18n()

const value = computed(() => Math.round(clamp(props.alpha, 0, 100)))

const trackStyle = computed<CSSProperties>(() => alphaTrackBackground(props.rgb))

function onInput(event: Event): void {
  const next = Math.round(clamp(Number((event.target as HTMLInputElement).value), 0, 100))
  if (next !== value.value) emit('update:alpha', next)
}
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="relative h-6 min-w-0 flex-1">
      <div
        class="opacity-track pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        :style="trackStyle"
      />
      <input
        class="opacity-range absolute inset-0 h-full w-full cursor-pointer"
        type="range"
        min="0"
        max="100"
        step="1"
        :value="value"
        :aria-label="t('colorPicker.alpha')"
        :aria-valuetext="String(value)"
        @input="onInput"
      />
    </div>
    <span class="shrink-0 whitespace-nowrap text-sm leading-5 text-slate-600">
      {{ t('colorPicker.alpha') }}
    </span>
  </div>
</template>

<style scoped>
/* 内描边：浅色渐变 / 棋盘格在白色背景上也能看清轨道边界 */
.opacity-track {
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 0.12);
}

/* 轨道渐变的绘制交给上层 div，这里清掉浏览器默认外观与轨道 */
.opacity-range {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
  background: transparent;
}

.opacity-range:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
  border-radius: 9999px;
}

.opacity-range::-webkit-slider-runnable-track {
  height: 24px;
  border: 0;
  background: transparent;
}

.opacity-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  margin-top: 2px;
  border: 0;
  border-radius: 9999px;
  background-color: #fff;
  box-shadow:
    0 1px 3px rgb(15 23 42 / 0.3),
    0 1px 2px rgb(15 23 42 / 0.18);
  cursor: grab;
}

.opacity-range:active::-webkit-slider-thumb {
  cursor: grabbing;
}

/* Firefox：轨道 / 进度条透明，只保留自绘拇指 */
.opacity-range::-moz-range-track {
  height: 24px;
  border: 0;
  background: transparent;
}

.opacity-range::-moz-range-progress {
  background: transparent;
}

.opacity-range::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 9999px;
  background-color: #fff;
  box-shadow:
    0 1px 3px rgb(15 23 42 / 0.3),
    0 1px 2px rgb(15 23 42 / 0.18);
  cursor: grab;
}

.opacity-range:active::-moz-range-thumb {
  cursor: grabbing;
}
</style>
