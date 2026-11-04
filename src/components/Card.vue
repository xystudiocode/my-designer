<script setup lang="ts">
/**
 * 卡片外壳：白底、8px 圆角、阴影，悬浮 / 键盘聚焦时整体放大 1.05 倍。
 * - 默认插槽：卡片主体内容（撑开卡片高度）
 * - previews 插槽：可选，展开时从卡片下方浮出的面板（不参与重排）
 */
withDefaults(
  defineProps<{
    /** 放大原点：贴边的卡片向内放大，避免撑出页面 */
    origin?: string
  }>(),
  { origin: 'center' },
)
</script>

<template>
  <article class="card-base" :style="{ transformOrigin: origin }">
    <slot />

    <!-- 展开状态：绝对定位在卡片下方，因此展开不会重排卡片内部布局 -->
    <div v-if="$slots.previews" class="card-base__previews">
      <slot name="previews" />
    </div>
  </article>
</template>

<style scoped>
/* 卡片：白底、8px 圆角、阴影、8px 内边距；内容不足时向下生长（默认无滚动条） */
.card-base {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  padding: 8px;
  border-radius: 8px;
  background-color: #fff;
  box-shadow:
    0 2px 10px rgb(15 23 42 / 0.08),
    0 1px 2px rgb(15 23 42 / 0.05);
  transform: scale(1);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-radius 0.25s ease;
  will-change: transform;
}

/*
 * 悬浮 / 键盘聚焦时整卡与子组件一起放大 1.05 倍，0.25s 动画。
 * 键盘聚焦用 :focus-visible 而不是 :focus-within：鼠标点击按钮后焦点会留在按钮上，
 * :focus-within 会让卡片在鼠标移开后仍然保持展开（卡住），直到用户再点一次页面。
 */
.card-base:hover,
.card-base:has(:focus-visible) {
  transform: scale(1.05);
  box-shadow: 0 28px 56px -16px rgb(15 23 42 / 0.35);
}

/* 只有带展开面板时才削平底部圆角，让卡片与面板连成一体 */
.card-base:hover:has(> .card-base__previews),
.card-base:has(:focus-visible):has(> .card-base__previews) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

/* 展开面板：Wrap 布局，横竖 16px 间隔；超出时竖向滚动 */
.card-base__previews {
  position: absolute;
  top: 100%;
  left: 0;
  display: flex;
  flex-flow: row wrap;
  align-content: flex-start;
  gap: 16px;
  width: 100%;
  max-height: 60%;
  padding: 0 8px 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-radius: 0 0 8px 8px;
  background-color: #fff;
  box-shadow: 0 28px 56px -16px rgb(15 23 42 / 0.35);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease,
    visibility 0.25s;
  scrollbar-width: thin;
  scrollbar-color: var(--color-accent-70) transparent;
}

.card-base:hover .card-base__previews,
.card-base:has(:focus-visible) .card-base__previews {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.card-base__previews::-webkit-scrollbar {
  width: 6px;
}

.card-base__previews::-webkit-scrollbar-track {
  background: transparent;
}

.card-base__previews::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background-color: var(--color-accent-70);
}

@media (prefers-reduced-motion: reduce) {
  .card-base,
  .card-base__previews {
    transition-duration: 0.001ms;
  }
}
</style>
