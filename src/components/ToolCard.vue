<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import type { ToolCardData } from '@/data/tools'
import Card from './Card.vue'

const props = defineProps<{
  card: ToolCardData
  /** 放大原点：贴边的卡片向内放大，避免撑出页面 */
  origin: string
}>()

const emit = defineEmits<{ (e: 'preview', index: number): void }>()

const { t } = useI18n()
const router = useRouter()

const head = ref<HTMLElement | null>(null)
const title = ref<HTMLElement | null>(null)
const openButton = ref<HTMLButtonElement | null>(null)
const isButtonFullWidth = ref(false)

let headObserver: ResizeObserver | undefined

/** 「打开」按钮侧边塞不下时换行并占满整行 */
function detectButtonWrap() {
  const titleEl = title.value
  const buttonEl = openButton.value
  if (!titleEl || !buttonEl) return

  // 先复位整行样式再测量自然布局，否则 flex-basis: 100% 会让按钮永远处于下一行（自锁）
  buttonEl.classList.remove('tool-card__open--full')
  void buttonEl.offsetWidth

  const wrapped = buttonEl.offsetTop >= titleEl.offsetTop + titleEl.offsetHeight - 1
  if (wrapped) buttonEl.classList.add('tool-card__open--full')
  isButtonFullWidth.value = wrapped
}

onMounted(() => {
  detectButtonWrap()
  headObserver = new ResizeObserver(detectButtonWrap)
  if (head.value) headObserver.observe(head.value)
  window.addEventListener('resize', detectButtonWrap)
})

// 语言切换会改变标题长度，重新判断按钮是否需要整行
watch(
  () => props.card.title,
  () => nextTick(detectButtonWrap),
)

onBeforeUnmount(() => {
  headObserver?.disconnect()
  window.removeEventListener('resize', detectButtonWrap)
})

/** icon 支持两种写法：path 的 d、或完整的 <svg> 代码 */
const isRawSvg = computed(() => props.card.icon.trimStart().startsWith('<svg'))

/** 点击「打开」跳转到卡片定义里配置的页面（路由在 src/router/index.ts 注册） */
function openTool() {
  router.push(props.card.to)
}
</script>

<template>
  <Card class="tool-card" :origin="origin">
    <div ref="head" class="tool-card__head">
      <span class="tool-card__icon" aria-hidden="true">
        <svg
          v-if="!isRawSvg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path :d="card.icon" />
        </svg>
        <span v-else v-html="card.icon"></span>
      </span>

      <div class="tool-card__heading">
        <h3 ref="title" class="tool-card__title">{{ card.title }}</h3>
        <button
          ref="openButton"
          type="button"
          class="tool-card__open"
          :class="{ 'tool-card__open--full': isButtonFullWidth }"
          @click="openTool"
        >
          {{ t('cards.open') }}
        </button>
      </div>
    </div>

    <p class="tool-card__desc">{{ card.desc }}</p>

    <!-- 展开状态：图片预览 -->
    <template #previews>
      <button
        v-for="(preview, index) in card.previews"
        :key="preview"
        type="button"
        class="tool-card__preview"
        :aria-label="t('cards.previewAlt', { name: card.title, index: index + 1 })"
        @click="emit('preview', index)"
      >
        <img
          :src="preview"
          :alt="t('cards.previewAlt', { name: card.title, index: index + 1 })"
          loading="lazy"
        />
      </button>
    </template>
  </Card>
</template>

<style scoped>
/*
 * 卡片收起时的最小高度 200px：只作用于工作台的 ToolCard
 * （其他卡片类型各自维护最小高度，例如 ColorCard 由内容决定，不受影响）。
 * 悬浮时整卡 scale(1.05) 并向下展开预览面板，整体视觉高度限制在
 * 默认卡高的 1.05 ~ 2.0 倍（换算逻辑见 Card.vue 的 syncPreviewTop）。
 */
.tool-card {
  min-height: 200px;
}

.tool-card__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.tool-card__icon {
  display: flex;
  flex: 0 0 auto;
  color: var(--color-accent-60);
}

.tool-card__icon :deep(svg) {
  display: block;
  width: 32px;
  height: 32px;
}

.tool-card__heading {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tool-card__title {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
}

/* 按钮：padding 8px、4px 圆角；accent-60 / 悬浮 accent-70 / 按下 accent-55 */
.tool-card__open {
  flex: 0 0 auto;
  padding: 8px;
  border: 0;
  border-radius: 4px;
  background-color: var(--color-accent-60);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.tool-card__open:hover {
  background-color: var(--color-accent-70);
}

.tool-card__open:active {
  background-color: var(--color-accent-55);
}

/* 侧边塞不下：换行后占满整行 */
.tool-card__open--full {
  flex: 1 0 100%;
  width: 100%;
}

.tool-card__desc {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: break-word;
}

/* 预览图：展开后视觉尺寸约 480×270 */
.tool-card__preview {
  flex: 0 0 auto;
  width: min(480px, 100%);
  padding: 0;
  border: 0;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 8px;
  background-color: #f1f5f9;
  cursor: zoom-in;
}

.tool-card__preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tool-card__preview:focus-visible,
.tool-card__open:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
}
</style>
