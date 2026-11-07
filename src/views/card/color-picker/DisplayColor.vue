<script setup lang="ts">
/**
 * 「选择颜色」结果卡片：64×64、8px 圆角，棋盘格背景 + 当前颜色（含不透明度）覆盖层。
 * 不带文字，标题由页面在外层渲染。
 *
 * 超出 sRGB 色域时，「浏览器实际显示」卡片需要把 `oklch()` 这类原始 CSS 直接交给浏览器裁剪，
 * 此时用 `css` 代替 `rgb` / `alpha`；`label` 用于覆盖读屏名称。
 */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { colorCss, type RgbColor } from './color'

const props = withDefaults(
  defineProps<{
    /** 颜色（sRGB 0-255）；提供 `css` 时可省略 */
    rgb?: RgbColor
    /** 不透明度 0-100（仅在用 rgb 渲染时生效） */
    alpha?: number
    /** 直接作为背景色的 CSS（如超出 sRGB 的 oklch()），交给浏览器裁剪；优先于 rgb / alpha */
    css?: string
    /** 读屏名称，默认「显示颜色」 */
    label?: string
  }>(),
  { alpha: 100, css: '', label: '' },
)

const { t } = useI18n()

const overlayColor = computed(() =>
  props.css !== '' ? props.css : colorCss(props.rgb ?? { r: 0, g: 0, b: 0 }, props.alpha),
)

const accessibleLabel = computed(() => props.label || t('colorPicker.displayColor'))
</script>

<template>
  <div
    class="display-color h-16 w-16 shrink-0 overflow-hidden rounded-[8px]"
    role="img"
    :aria-label="accessibleLabel"
  >
    <div class="h-full w-full" :style="{ backgroundColor: overlayColor }"></div>
  </div>
</template>

<style scoped>
/* 1px 描边：选择白色时也能看清色块边界（需求：「选择颜色」区域加个描边） */
.display-color {
  border: 1px solid var(--color-slate-300);
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
}
</style>
