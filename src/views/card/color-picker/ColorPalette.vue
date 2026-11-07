<script setup lang="ts">
/**
 * 调色板（颜色选择器左列下方的一栏）。
 *
 * - 用户手动「添加当前颜色」，不限量；数据由父组件维护（见 `pickerState.ts`）。
 * - 分页按「满 3 行才换页」：用 ResizeObserver 测量网格实际列数，
 *   每页条数 = 列数 × PALETTE_PAGE_ROWS（DOM 未测量前用兜底 PALETTE_PAGE_SIZE）；
 *   items 变短（或窗口变化导致每页条数变化）时夹紧页码，items 变长（新颜色插入最前）时回到第 1 页。
 * - 色块区域始终按 3 行高度预留（3×40 + 2×12 = 144px），最后一页只剩 1 行也不收缩，
 *   保证下方翻页器与左右箭头的垂直位置稳定。
 * - 色块 40×40、8px 圆角，透明颜色透出棋盘格；点击色块应用颜色，
 *   悬浮 / 键盘聚焦色块时右上角出现圆形删除按钮（emit 全局下标）。
 * - 网格外包 `.palette-body`，左右各留 44px gutter 放「左右悬浮不透明箭头」：
 *   指针在调色板区域移动时箭头渐显，静止约 2500ms 或离开区域后渐隐；
 *   第一页不渲染左箭头、最后一页不渲染右箭头（不能翻就直接隐藏，不做置灰）；
 *   页面选择器弹层（`[data-color-pager-popover]`）区域不算，悬停它不会唤起箭头。
 *   箭头完全位于 gutter 中，绝不覆盖色块，不打扰用户选色。
 * - 网格下方居中渲染 `<ColorPager>`（items 非空时始终显示，即使只有 1 页）。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { colorCss, formatColor } from './color'
import ColorPager from './ColorPager.vue'
import { PALETTE_PAGE_ROWS, PALETTE_PAGE_SIZE, type StoredColor } from './pickerState'

const props = defineProps<{
  /** 调色板颜色：新颜色在最前，不限量 */
  items: StoredColor[]
}>()

const emit = defineEmits<{
  apply: [color: StoredColor]
  /** 要移除的颜色在 items 里的全局下标 */
  remove: [index: number]
  add: []
}>()

const { t } = useI18n()

/** 当前页（从 1 开始） */
const page = ref(1)

/** 网格当前实际列数（ResizeObserver 测量 gridTemplateColumns 得到；0 = 尚未测量） */
const columnCount = ref(0)

/**
 * 每页条数 = 当前列数 × PALETTE_PAGE_ROWS（满 3 行才换页）。
 * DOM 尚未测量时用兜底值 PALETTE_PAGE_SIZE（54）。
 */
const pageSize = computed(() =>
  columnCount.value > 0 ? columnCount.value * PALETTE_PAGE_ROWS : PALETTE_PAGE_SIZE,
)

/** 色块区域固定按 3 行高度预留：3×40px + 2×12px 间距 = 144px（最后一页 1 行也不收缩） */
const bodyMinHeight = `${PALETTE_PAGE_ROWS * 40 + (PALETTE_PAGE_ROWS - 1) * 12}px`

const pageCount = computed(() => Math.max(1, Math.ceil(props.items.length / pageSize.value)))

interface PaletteEntry {
  color: StoredColor
  /** items 中的全局下标（remove 用） */
  index: number
}

const pageItems = computed<PaletteEntry[]>(() => {
  const start = (page.value - 1) * pageSize.value
  return props.items
    .slice(start, start + pageSize.value)
    .map((color, offset) => ({ color, index: start + offset }))
})

const gridEl = ref<HTMLDivElement | null>(null)
let gridResizeObserver: ResizeObserver | undefined

/** 读取 auto-fill 后的实际列数（getComputedStyle 的 gridTemplateColumns 会返回重复出的 track 列表） */
function measureColumns() {
  const grid = gridEl.value
  if (!grid) return
  const tracks = getComputedStyle(grid).gridTemplateColumns
  if (!tracks || tracks === 'none') return
  const count = tracks.split(/\s+/).filter(Boolean).length
  if (count > 0 && count !== columnCount.value) columnCount.value = count
}

// 网格挂载 / 尺寸变化时重新测量列数：列数变化 → pageSize 变化 → pageCount 夹紧当前页
watch(
  gridEl,
  (grid) => {
    gridResizeObserver?.disconnect()
    gridResizeObserver = undefined
    if (!grid) return
    measureColumns()
    if (typeof ResizeObserver === 'undefined') return
    gridResizeObserver = new ResizeObserver(() => measureColumns())
    gridResizeObserver.observe(grid)
  },
  { immediate: true, flush: 'post' },
)

/** 色块的 title / aria-label：如「使用颜色 #3B82F6」 */
function colorLabel(color: StoredColor): string {
  return t('colorPicker.useColor', { color: formatColor(color, color.a, 'hex') })
}

// 页数变少（删色 / 数据被外部替换）时夹紧当前页
watch(pageCount, (count) => {
  if (page.value > count) page.value = count
})

// items 变长：新颜色插入最前，回到第 1 页让用户看到它；变短：页码越界时夹紧
watch(
  () => props.items.length,
  (length, previous) => {
    if (length > previous) page.value = 1
    else if (length < previous && page.value > pageCount.value) page.value = pageCount.value
  },
)

/** 左右悬浮箭头：指针静止多久后渐隐（ms，含 0.18s 渐隐动画，2.6s 内完全隐藏） */
const ARROW_IDLE_DELAY = 2300

const bodyEl = ref<HTMLDivElement | null>(null)
/** 左右悬浮箭头当前是否可见（指针移动时显示，静止 / 离开后渐隐） */
const arrowsVisible = ref(false)
let idleTimer: ReturnType<typeof setTimeout> | undefined

/** 第一页不渲染左箭头、最后一页不渲染右箭头（不能翻就隐藏，不做置灰） */
const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < pageCount.value)

function clearIdleTimer() {
  if (idleTimer === undefined) return
  clearTimeout(idleTimer)
  idleTimer = undefined
}

/** 页面选择器弹层区域不算调色板悬浮区域：命中它时既不显示箭头也不重置计时 */
function isPagerPopoverEvent(event: Event): boolean {
  const target = event.target
  return target instanceof Element && target.closest('[data-color-pager-popover]') !== null
}

/**
 * 指针停在箭头上时静止也不隐藏（需求：hover 箭头保持可见）。
 * 注意不把「键盘焦点在箭头上」算进来：点击箭头后焦点会留在按钮上，
 * 若据此保持可见，鼠标静止后箭头会永远不消失。
 */
function isArrowHovered(): boolean {
  const body = bodyEl.value
  return body !== null && body.querySelector('.palette-nav:hover') !== null
}

/** 显示箭头并重置静止隐藏计时 */
function showArrows() {
  arrowsVisible.value = true
  clearIdleTimer()
  idleTimer = setTimeout(() => {
    idleTimer = undefined
    if (isArrowHovered()) return
    arrowsVisible.value = false
  }, ARROW_IDLE_DELAY)
}

function hideArrows() {
  clearIdleTimer()
  arrowsVisible.value = false
}

function onPointerMove(event: PointerEvent) {
  if (isPagerPopoverEvent(event)) return
  showArrows()
}

function onPointerDown(event: PointerEvent) {
  if (isPagerPopoverEvent(event)) return
  showArrows()
}

function onPointerLeave() {
  hideArrows()
}

/** 点击左右箭头翻页（夹紧 1..pageCount）；点击后重新显示并重置隐藏计时 */
function goBy(delta: number) {
  const next = Math.min(Math.max(page.value + delta, 1), pageCount.value)
  if (next !== page.value) page.value = next
  showArrows()
}

onBeforeUnmount(() => {
  clearIdleTimer()
  gridResizeObserver?.disconnect()
})
</script>

<template>
  <section
    class="w-full min-w-0"
    @pointermove="onPointerMove"
    @pointerdown="onPointerDown"
    @pointerleave="onPointerLeave"
  >
    <div class="flex items-center justify-between gap-3">
      <h2 class="min-w-0 text-[19px] leading-6 font-bold text-slate-900">
        {{ t('colorPicker.palette') }}
      </h2>
      <button type="button" class="palette-add shrink-0" @click="emit('add')">
        <svg class="palette-add__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 3.25v9.5M3.25 8h9.5"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
        <span>{{ t('colorPicker.addToPalette') }}</span>
      </button>
    </div>

    <p v-if="items.length === 0" class="mt-1 text-[13px] leading-[18px] text-slate-500">
      {{ t('colorPicker.paletteEmpty') }}
    </p>

    <template v-else>
      <div ref="bodyEl" class="palette-body mt-2" :style="{ minHeight: bodyMinHeight }">
        <button
          v-if="canPrev"
          type="button"
          class="palette-nav palette-nav--left"
          :class="{ 'palette-nav--visible': arrowsVisible }"
          :aria-label="t('colorPicker.prevPage')"
          @click="goBy(-1)"
        >
          <svg class="palette-nav__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 3.5 5.5 8 10 12.5"
              stroke="#E6E6E6"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <div ref="gridEl" class="palette-grid" role="group" :aria-label="t('colorPicker.palette')">
          <div v-for="entry in pageItems" :key="entry.index" class="palette-cell">
            <button
              type="button"
              class="palette-swatch"
              :title="colorLabel(entry.color)"
              :aria-label="colorLabel(entry.color)"
              @click="emit('apply', entry.color)"
            >
              <span
                class="palette-swatch__color"
                :style="{ backgroundColor: colorCss(entry.color, entry.color.a) }"
              />
            </button>
            <button
              type="button"
              class="palette-remove"
              :aria-label="t('colorPicker.removeFromPalette')"
              @click.stop="emit('remove', entry.index)"
            >
              <svg class="palette-remove__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4.5 4.5l7 7M11.5 4.5l-7 7"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <button
          v-if="canNext"
          type="button"
          class="palette-nav palette-nav--right"
          :class="{ 'palette-nav--visible': arrowsVisible }"
          :aria-label="t('colorPicker.nextPage')"
          @click="goBy(1)"
        >
          <svg class="palette-nav__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M6 3.5 10.5 8 6 12.5"
              stroke="#E6E6E6"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div class="palette-pager">
        <ColorPager :page="page" :page-count="pageCount" @update:page="page = $event" />
      </div>
    </template>
  </section>
</template>

<style scoped>
/* 标题行右侧的「添加当前颜色」按钮 */
.palette-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 0;
  border-radius: 4px;
  background-color: var(--color-accent-60);
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  line-height: 16px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.palette-add:hover {
  background-color: var(--color-accent-70);
}

.palette-add:active {
  background-color: var(--color-accent-55);
}

.palette-add:focus-visible {
  outline: 2px solid var(--color-slate-500);
  outline-offset: 2px;
}

.palette-add__icon {
  display: block;
  width: 12px;
  height: 12px;
}

/*
 * 网格外层：左右各留 44px gutter 放悬浮大箭头，箭头永远在 gutter 里，不会覆盖色块。
 * min-height 由模板内联样式按 PALETTE_PAGE_ROWS 计算（3×40 + 2×12 = 144px）：
 * 最后一页只剩 1 行时区域高度不收缩，翻页器 / 左右箭头的垂直位置保持稳定。
 */
.palette-body {
  position: relative;
  padding-inline: 44px;
}

/* 40px 色块、12px 间距；容器变窄时自动换行 */
.palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(0, 40px));
  justify-content: start;
  /* 行高固定 40px，不要被外层预留的 3 行高度拉伸 */
  align-content: start;
  column-gap: 12px;
  row-gap: 12px;
}

/*
 * 左右悬浮不透明箭头：#0D0D0D 50% + #E6E6E6 圆角 chevron。
 * 默认 opacity 0 / hidden / pointer-events: none；指针在调色板区域移动时渐显，
 * 静止约 2.5s 或离开区域后渐隐（0.18s）。
 */
.palette-nav {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background-color: rgb(13 13 13 / 0.5);
  color: #e6e6e6;
  transform: translateY(-50%);
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.18s ease,
    visibility 0.18s ease,
    background-color 0.12s ease;
}

.palette-nav--left {
  left: 0;
}

.palette-nav--right {
  right: 0;
}

.palette-nav--visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.palette-nav:hover {
  background-color: rgb(13 13 13 / 0.72);
}

.palette-nav:active {
  background-color: rgb(13 13 13 / 0.85);
}

.palette-nav:focus-visible {
  outline: 2px solid var(--color-slate-400);
  outline-offset: 2px;
}

.palette-nav__icon {
  display: block;
  width: 16px;
  height: 16px;
}

.palette-cell {
  position: relative;
  width: 40px;
  height: 40px;
}

.palette-swatch {
  position: relative;
  display: block;
  width: 40px;
  height: 40px;
  padding: 0;
  overflow: hidden;
  /* 1px 描边：选白色 / 浅色时也能看清色块边界（与「选择颜色」区域一致） */
  border: 1px solid var(--color-slate-300);
  border-radius: 8px;
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
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 0.08);
  cursor: pointer;
  transition: filter 0.12s ease;
}

/* 颜色覆盖层：带不透明度时透出下面的棋盘格 */
.palette-swatch__color {
  position: absolute;
  inset: 0;
  display: block;
}

/* 悬浮暗 2%，按下暗 6% */
.palette-swatch:hover {
  filter: brightness(0.98);
}

.palette-swatch:active {
  filter: brightness(0.94);
}

.palette-swatch:focus-visible {
  outline: 2px solid var(--color-slate-500);
  outline-offset: 2px;
}

/* 右上角删除按钮：hover / focus-within 时才出现 */
.palette-remove {
  position: absolute;
  top: -5px;
  right: -5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background-color: #ffffff;
  color: var(--color-slate-500);
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.24);
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.9);
  transition:
    opacity 0.12s ease,
    transform 0.12s ease,
    visibility 0.12s ease,
    background-color 0.12s ease;
}

.palette-cell:hover .palette-remove,
.palette-cell:focus-within .palette-remove {
  opacity: 1;
  visibility: visible;
  transform: scale(1);
}

.palette-remove:hover {
  background-color: var(--color-slate-100);
}

.palette-remove:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 1px;
  opacity: 1;
  visibility: visible;
  transform: scale(1);
}

.palette-remove__icon {
  display: block;
  width: 10px;
  height: 10px;
}

/* 网格下方居中摆放翻页器 */
.palette-pager {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

@media (max-width: 640px) {
  .palette-body {
    padding-inline: 40px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .palette-add,
  .palette-swatch,
  .palette-remove,
  .palette-nav {
    transition-duration: 0.001ms;
  }
}
</style>
