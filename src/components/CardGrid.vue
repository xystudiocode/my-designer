<!-- CardGrid.vue -->
<script setup lang="ts" generic="T">
/**
 * Warp 布局网格：横向/竖向间隔均为 `gap`，按「最短列」依次填充，不按最高卡片对齐。
 * 只负责测量高度、计算位置与放大原点（origin），不关心卡片是什么类型；
 * 具体渲染通过 #item 作用域插槽交给父级。
 */
import { nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 参与布局的项，只用于遍历数量与生成 key，渲染由 #item 决定 */
    items: T[]
    /** 每列最小卡片宽度（决定列数） */
    minCardWidth?: number
    /** 卡片横向/竖向间距 */
    gap?: number
  }>(),
  { minCardWidth: 320, gap: 16 },
)

defineSlots<{
  item(props: { item: T; index: number; origin: string }): unknown
}>()

const container = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const cardWidth = ref(props.minCardWidth)
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
  const gap = props.gap
  if (width <= 0) return

  const columns = Math.max(1, Math.floor((width + gap) / (props.minCardWidth + gap)))
  const itemWidth = (width - gap * (columns - 1)) / columns
  cardWidth.value = itemWidth

  const columnHeights = Array.from({ length: columns }, () => 0)
  const next: Array<{ x: number; y: number; origin: string }> = []

  props.items.forEach((_, index) => {
    let column = 0
    for (let candidate = 1; candidate < columns; candidate += 1) {
      if ((columnHeights[candidate] ?? 0) < (columnHeights[column] ?? 0)) column = candidate
    }

    const y = columnHeights[column] ?? 0
    next.push({ x: column * (itemWidth + gap), y, origin: originFor(column, columns) })
    columnHeights[column] = y + (heights.value[index] ?? 0) + gap
  })

  positions.value = next
  totalHeight.value = Math.max(0, Math.max(...columnHeights) - gap)
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
  if (!laidOut.value && next.length === props.items.length && next.every((height) => height > 0)) {
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
    class="card-grid relative w-full transition-opacity duration-200"
    :class="{ 'opacity-0': !laidOut }"
    :style="{ height: `${totalHeight}px` }"
  >
    <div
      v-for="(item, index) in items"
      :key="index"
      class="card-grid__item absolute top-0 left-0"
      :style="{
        width: `${cardWidth}px`,
        transform: `translate3d(${positions[index]?.x ?? 0}px, ${positions[index]?.y ?? 0}px, 0)`,
      }"
    >
      <slot
        name="item"
        :item="item"
        :index="index"
        :origin="positions[index]?.origin ?? 'left top'"
      />
    </div>
  </div>
</template>

<style scoped>
/* 悬浮 / 键盘聚焦的卡片放大后要盖住相邻卡片 */
.card-grid__item:hover,
.card-grid__item:has(:focus-visible) {
  z-index: 20;
}
</style>
