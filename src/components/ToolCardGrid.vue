<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'
import ToolCard from './ToolCard.vue'
import type { ToolCardData } from '@/data/tools'

const props = defineProps<{ cards: ToolCardData[] }>()

const emit = defineEmits<{ (e: 'preview', payload: { card: ToolCardData; index: number }): void }>()

/** Warp 布局：卡片横向/竖向间隔均为 16px，按「最短列」依次填充，不按最高卡片对齐 */
const GAP = 16
const MIN_CARD_WIDTH = 320

const container = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const cardWidth = ref(MIN_CARD_WIDTH)
const totalHeight = ref(0)
const positions = ref<Array<{ x: number; y: number; origin: string }>>([])
const heights = ref<number[]>([])
const laidOut = ref(false)

let containerObserver: ResizeObserver | undefined

function originFor(column: number, columns: number) {
  if (column === 0) return 'left top'
  if (column === columns - 1) return 'right top'
  return 'center top'
}

function layout() {
  const width = containerWidth.value
  if (width <= 0) return

  const columns = Math.max(1, Math.floor((width + GAP) / (MIN_CARD_WIDTH + GAP)))
  const itemWidth = (width - GAP * (columns - 1)) / columns
  cardWidth.value = itemWidth

  const columnHeights = Array.from({ length: columns }, () => 0)
  const next: Array<{ x: number; y: number; origin: string }> = []

  props.cards.forEach((_, index) => {
    let column = 0
    for (let candidate = 1; candidate < columns; candidate += 1) {
      if ((columnHeights[candidate] ?? 0) < (columnHeights[column] ?? 0)) column = candidate
    }

    const y = columnHeights[column] ?? 0
    next.push({ x: column * (itemWidth + GAP), y, origin: originFor(column, columns) })
    columnHeights[column] = y + (heights.value[index] ?? 0) + GAP
  })

  positions.value = next
  totalHeight.value = Math.max(0, Math.max(...columnHeights) - GAP)
}

/** 渲染后测量每张卡片的实际高度（文案换行、语言切换都会影响），再重排 */
function measureAll() {
  const element = container.value
  if (!element) return

  const next = [...heights.value]
  let changed = false
  Array.from(element.children).forEach((child, index) => {
    const height = (child as HTMLElement).offsetHeight
    if (next[index] !== height) {
      next[index] = height
      changed = true
    }
  })

  if (changed) {
    heights.value = next
    layout()
  }

  // 首次测量完成前先隐藏，避免卡片重叠闪一下
  if (!laidOut.value && next.length === props.cards.length && next.every((height) => height > 0)) {
    laidOut.value = true
  }
}

onMounted(() => {
  const element = container.value
  if (!element) return

  containerObserver = new ResizeObserver(() => {
    containerWidth.value = container.value?.clientWidth ?? 0
    layout()
    nextTick(measureAll)
  })
  containerObserver.observe(element)

  containerWidth.value = element.clientWidth
  layout()
  nextTick(measureAll)
})

onUpdated(measureAll)

onBeforeUnmount(() => containerObserver?.disconnect())
</script>

<template>
  <div
    ref="container"
    class="relative w-full transition-opacity duration-200"
    :class="{ 'opacity-0': !laidOut }"
    :style="{ height: `${totalHeight}px` }"
  >
    <div
      v-for="(card, index) in cards"
      :key="index"
      class="grid-item absolute top-0 left-0"
      :style="{
        width: `${cardWidth}px`,
        transform: `translate3d(${positions[index]?.x ?? 0}px, ${positions[index]?.y ?? 0}px, 0)`,
      }"
    >
      <ToolCard
        :card="card"
        :origin="positions[index]?.origin ?? 'left top'"
        @preview="(previewIndex) => emit('preview', { card, index: previewIndex })"
      />
    </div>
  </div>
</template>

<style scoped>
/* 悬浮的卡片放大后需要盖住相邻卡片；键盘 :focus-visible 聚焦时同理 */
.grid-item:hover,
.grid-item:has(:focus-visible) {
  z-index: 20;
}
</style>
