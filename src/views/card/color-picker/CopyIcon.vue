<script setup lang="ts">
/**
 * 复制 / 已复制图标（自绘 SVG）。
 * copied 为 true 时：复制图标缩小消失，对勾按书写方向从左侧画出来（0.25s）；
 * 恢复 false 时：对勾从右侧逐渐消失、复制图标放大回来（0.5s）。
 */
withDefaults(
  defineProps<{
    copied?: boolean
    /** 图标边长（px），默认 16 */
    size?: number
  }>(),
  { copied: false, size: 16 },
)
</script>

<template>
  <span
    class="copy-icon"
    :class="{ 'copy-icon--copied': copied }"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  >
    <svg class="copy-icon__copy" viewBox="0 0 16 16" fill="none">
      <rect
        x="5.2"
        y="5.2"
        width="8.9"
        height="8.9"
        rx="1.7"
        stroke="currentColor"
        stroke-width="1.3"
      />
      <path
        d="M10.7 3.1H4.5A1.7 1.7 0 0 0 2.8 4.8v6.2"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
      />
    </svg>
    <svg class="copy-icon__check" viewBox="0 0 16 16" fill="none">
      <path
        class="copy-icon__check-path"
        d="M3.1 8.6 6.4 11.7 12.9 5.1"
        pathLength="1"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </span>
</template>

<style scoped>
.copy-icon {
  position: relative;
  display: inline-block;
  flex: none;
}

.copy-icon svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.copy-icon__copy {
  transform: scale(1);
  transform-origin: center;
  opacity: 1;
  transition:
    transform 0.5s ease,
    opacity 0.5s ease;
}

.copy-icon__check-path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 0.5s ease;
}

.copy-icon--copied .copy-icon__copy {
  transform: scale(0.35) rotate(-8deg);
  opacity: 0;
}

.copy-icon--copied .copy-icon__check-path {
  stroke-dashoffset: 0;
  /* 画勾（写出对勾）动画：0.25s；消失仍用上方 0.5s「从右往左擦掉」 */
  transition-duration: 0.25s;
}

@media (prefers-reduced-motion: reduce) {
  .copy-icon__copy,
  .copy-icon__check-path {
    transition-duration: 0.001ms;
  }
}
</style>
