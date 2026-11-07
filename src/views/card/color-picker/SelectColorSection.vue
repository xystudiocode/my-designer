<script setup lang="ts">
/**
 * 「选择颜色」区块：结果色卡 + 从屏幕取色按钮。
 *
 * - 未超出 sRGB 时只有一张 64×64 结果卡（与原有行为一致）。
 * - OKLCH 模式选中超出 sRGB 的颜色时，结果卡按需求分裂为 2~3 张：
 *   ① 虚线边框的「超出 sRGB 色域」说明卡；
 *   ② 可显示的回退颜色卡（带「回退」按钮，采用色域映射后的颜色）；
 *   ③ 浏览器实际显示卡（用原始 oklch() CSS 让浏览器自己裁剪；与回退色相同时不显示）。
 * - 该组件只用于宽屏右栏的「选择颜色」区块；窄屏（≤1100px）时右栏隐藏，
 *   改由取色器在二维图区域 / 多滑块区域最下面各显示一个轻量「显示颜色」（`DisplayColor`）。
 */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import type { OutOfGamutInfo, RgbColor } from './color'
import DisplayColor from './DisplayColor.vue'

const props = defineProps<{
  rgb: RgbColor
  alpha: number
  /** 当前模式空间颜色是否超出 sRGB（仅 OKLCH 会给出非 null） */
  gamut: OutOfGamutInfo | null
}>()

const emit = defineEmits<{
  /** 请求「从屏幕中选取颜色」：EyeDropper 只在页面里调用，不支持时的错误提示也由页面负责 */
  'pick-from-screen': []
  /** 采用可显示的回退颜色（不透明度保持不变） */
  'use-fallback': [rgb: RgbColor]
}>()

const { t } = useI18n()

/** 浏览器裁剪色与回退色相同时，无需再单独显示「浏览器实际显示」卡片 */
const showBrowserDisplay = computed(() => {
  const info = props.gamut
  if (!info) return false
  return (
    info.browserRgb.r !== info.fallbackRgb.r ||
    info.browserRgb.g !== info.fallbackRgb.g ||
    info.browserRgb.b !== info.fallbackRgb.b
  )
})
</script>

<template>
  <section class="select-color" :aria-label="t('colorPicker.selectColor')">
    <h2 class="select-color__title">{{ t('colorPicker.selectColor') }}</h2>

    <div v-if="gamut" class="select-color__cards">
      <!-- ① 超出 sRGB 色域的说明卡：虚线边框，可以比色卡宽（自适应） -->
      <div class="select-color__notice" role="note">
        <span class="select-color__notice-title">{{ t('colorPicker.outOfGamut') }}</span>
        <span class="select-color__notice-text">{{ t('colorPicker.outOfGamutReason') }}</span>
      </div>

      <!-- ② 可显示的回退颜色：色域映射（降低彩度）后的颜色 + 「回退」按钮 -->
      <div class="select-color__card">
        <span class="select-color__label">{{ t('colorPicker.fallbackColor') }}</span>
        <DisplayColor :rgb="gamut.fallbackRgb" :alpha="alpha" />
        <button
          type="button"
          class="select-color__fallback"
          @click="emit('use-fallback', gamut.fallbackRgb)"
        >
          {{ t('colorPicker.useFallback') }}
        </button>
      </div>

      <!-- ③ 浏览器实际显示：原始 oklch() 作为背景色，由浏览器自己裁剪到 sRGB -->
      <div v-if="showBrowserDisplay" class="select-color__card">
        <span class="select-color__label">{{ t('colorPicker.browserDisplay') }}</span>
        <DisplayColor :css="gamut.css" :label="t('colorPicker.browserDisplay')" />
      </div>
    </div>

    <!-- 未超出色域 / 非 OKLCH 模式：保持原有单张结果卡 -->
    <DisplayColor v-else :rgb="rgb" :alpha="alpha" />

    <!-- 从屏幕取色：EyeDropper 能力检测与错误提示都在页面处理 -->
    <button type="button" class="select-color__eyedropper" @click="emit('pick-from-screen')">
      <svg class="select-color__eyedropper-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14.5 4.5a2.12 2.12 0 0 1 3 3M12 7l5 5M13 6l-1.2 1.2a2 2 0 0 0 0 2.83l3.17 3.17a2 2 0 0 0 2.83 0L19 12M4 20l3.5-.8 7.3-7.3-2.7-2.7-7.3 7.3L4 20Z"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>{{ t('colorPicker.eyedropper') }}</span>
    </button>
  </section>
</template>

<style scoped>
.select-color {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.select-color__title {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

/* 说明卡单独占一行，其余色卡在下一行换行排列 */
.select-color__cards {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.select-color__notice {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex: 1 1 100%;
  gap: 4px;
  max-width: 320px;
  padding: 8px 12px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background-color: #f8fafc;
}

.select-color__notice-title {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.select-color__notice-text {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.select-color__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.select-color__label {
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

/* 「回退」按钮：与 64px 色卡同宽，白底描边的小按钮 */
.select-color__fallback {
  box-sizing: border-box;
  width: 64px;
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #fff;
  color: #334155;
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.select-color__fallback:hover {
  border-color: #cbd5e1;
  background-color: #f8fafc;
  color: #0f172a;
}

.select-color__fallback:active {
  background-color: #f1f5f9;
}

.select-color__fallback:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
}

/* 「从屏幕中选取颜色」按钮：白底描边，与单位面板的浅色卡片风格一致 */
.select-color__eyedropper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #fff;
  color: #334155;
  font-size: 14px;
  line-height: 1.4;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.select-color__eyedropper:hover {
  border-color: #cbd5e1;
  background-color: #f8fafc;
  color: #0f172a;
}

.select-color__eyedropper:active {
  background-color: #f1f5f9;
}

.select-color__eyedropper:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
}

.select-color__eyedropper-icon {
  width: 16px;
  height: 16px;
  flex: none;
}

@media (prefers-reduced-motion: reduce) {
  .select-color__fallback,
  .select-color__eyedropper {
    transition-duration: 0.001ms;
  }
}
</style>
