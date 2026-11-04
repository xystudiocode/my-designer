<script setup lang="ts">
/**
 * 卡片外壳：白底、8px 圆角、阴影，悬浮 / 键盘聚焦时整体放大 1.05 倍。
 * - 默认插槽：卡片主体内容（撑开卡片高度）
 * - previews 插槽：可选，展开时从内容区底部浮出的面板（不参与重排）
 *
 * 卡片仍然保留 200px 最小高度；但展开面板不是贴在卡片底部（内容少时中间会空一大截），
 * 而是锚定在内容区（标题 + 描述）的真实高度底部：内容区 min-height 为 0，
 * 用 ResizeObserver 量出内容底部到卡片顶部的距离写进 CSS 变量。
 *
 * 展开面板高度跟随介绍图（预览图）本身：默认显示完整的一行预览图，
 * 整体视觉高度再限制在默认卡高的 1.05 ~ 2.0 倍之间（悬浮时整卡会 scale(1.05)，
 * 所以 2.0 倍上限要按缩放换算回布局尺寸）。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

/** 与样式里 .card-base:hover 的 scale 保持一致（用于换算 2.0 倍视觉高度上限） */
const HOVER_SCALE = 1.05

withDefaults(
  defineProps<{
    /** 放大原点：贴边的卡片向内放大，避免撑出页面 */
    origin?: string
  }>(),
  { origin: 'center' },
)

const cardEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const previewsEl = ref<HTMLElement | null>(null)

let contentObserver: ResizeObserver | undefined

/**
 * 计算展开面板的 top 与高度上限：
 * - top：内容区底部（含 8px 下内边距），让面板紧贴描述最后一行；
 * - 高度：默认显示完整的一行预览图（高度跟随图片），整体视觉高度上限为默认卡高的 2.0 倍。
 */
function syncPreviewTop() {
  const card = cardEl.value
  const content = contentEl.value
  if (!card || !content) return

  // 悬浮时卡片带 scale(1.05)：offsetWidth / offsetHeight 是未缩放的布局尺寸
  const cardRect = card.getBoundingClientRect()
  const scale = card.offsetWidth > 0 ? cardRect.width / card.offsetWidth : 1
  const paddingBottom = Number.parseFloat(getComputedStyle(card).paddingBottom) || 0
  const top = (content.getBoundingClientRect().bottom - cardRect.top) / scale + paddingBottom

  const cardHeight = card.offsetHeight
  // 悬浮时整卡（含面板）会再被放大 1.05 倍；视觉总高 = HOVER_SCALE × (top + 面板高)，
  // 上限取默认卡高的 2.0 倍，反推面板在布局里的最大高度。
  const maxPanelHeight = Math.max(0, (2 * cardHeight) / HOVER_SCALE - top)

  // 面板高度跟随预览图：取第一行（第一张）预览图的高度 + 面板底部内边距；
  // 再与 2.0 倍上限取小，多张图时在面板内滚动。
  const previews = previewsEl.value
  const previewRow = previews?.firstElementChild
  const panelPaddingBottom = previews
    ? Number.parseFloat(getComputedStyle(previews).paddingBottom) || 0
    : 0
  const imageHeight = previewRow ? previewRow.getBoundingClientRect().height / scale : 0
  const desiredPanelHeight = imageHeight > 0 ? imageHeight + panelPaddingBottom : maxPanelHeight

  card.style.setProperty('--card-previews-top', `${top}px`)
  card.style.setProperty(
    '--card-previews-max-height',
    `${Math.min(desiredPanelHeight, maxPanelHeight)}px`,
  )
}

onMounted(() => {
  syncPreviewTop()
  if (contentEl.value) {
    contentObserver = new ResizeObserver(syncPreviewTop)
    contentObserver.observe(contentEl.value)
  }
})

onBeforeUnmount(() => contentObserver?.disconnect())
</script>

<template>
  <article ref="cardEl" class="card-base" :style="{ transformOrigin: origin }">
    <div ref="contentEl" class="card-base__content">
      <slot />
    </div>

    <!-- 展开状态：绝对定位在内容区下方，因此展开不会重排卡片内部布局 -->
    <div v-if="$slots.previews" ref="previewsEl" class="card-base__previews">
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

/* 内容区：真实高度（min-height 0），展开面板锚定在它下面而不是卡片最底部 */
.card-base__content {
  min-height: 0;
}

/* 展开面板：Wrap 布局，横竖 16px 间隔；超出时竖向滚动 */
.card-base__previews {
  position: absolute;
  /* 由 Card.vue 按内容区底部实测写入；未测量前退回卡片底部 */
  top: var(--card-previews-top, 100%);
  left: 0;
  display: flex;
  flex-flow: row wrap;
  align-content: flex-start;
  gap: 16px;
  width: 100%;
  /* 默认高度跟随第一行预览图；上限由 Card.vue 按「默认卡高 × 2.0 / 悬浮缩放」实测写入 */
  max-height: var(--card-previews-max-height, 100%);
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
