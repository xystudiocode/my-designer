<script setup lang="ts">
/**
 * 「选择颜色」结果卡片：64×64、8px 圆角，棋盘格背景 + 当前颜色（含不透明度）覆盖层。
 * 不带文字，标题由页面在外层渲染。
 */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { colorCss, type RgbColor } from './color'

const props = defineProps<{
  rgb: RgbColor
  alpha: number
}>()

const { t } = useI18n()

const overlayColor = computed(() => colorCss(props.rgb, props.alpha))
</script>

<template>
  <div
    class="display-color h-16 w-16 shrink-0 overflow-hidden rounded-[8px]"
    role="img"
    :aria-label="t('colorPicker.displayColor')"
  >
    <div class="h-full w-full" :style="{ backgroundColor: overlayColor }"></div>
  </div>
</template>

<style scoped>
/* 8px 方格棋盘格：颜色带透明度时透出；不透明度 100 时被纯色完全盖住 */
.display-color {
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
