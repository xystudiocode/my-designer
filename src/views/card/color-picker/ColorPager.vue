<script setup lang="ts">
/**
 * 颜色翻页组件（调色板等长列表的下方翻页器）。
 *
 * - 常驻触发器：居中胶囊，显示「第 x / y 页」；可聚焦（tabindex=0）。
 * - 悬浮 / 键盘聚焦触发器时，在触发器上方 8px 弹出浮层（0.18s 淡入上移）；
 *   指针移入浮层保持打开，完全移出后延迟 150ms 关闭（避免穿过 8px 间隙时闪烁）。
 * - 浮层只有一条 slate 胶囊快速选页条：最多同时显示 5 个页码（含当前页），两端各有一个
 *   小箭头；只有「当前选中页」点击后就地变成 number 输入框（Enter / blur 提交、Esc 取消），
 *   未选中页点击直接跳页。左右翻阅的大号悬浮箭头已改由调色板（ColorPalette）在左右留白
 *   中绘制，本组件不再负责；弹层根节点带 `data-color-pager-popover`，供父级排除悬浮区域。
 *
 * page / pageCount 由父组件控制；越界时 emit 夹紧后的值，组件内部只保留页码输入框的临时状态。
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useI18n } from '@/i18n'

const props = defineProps<{
  /** 当前页，从 1 开始 */
  page: number
  /** 总页数（至少按 1 处理） */
  pageCount: number
}>()

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const { t } = useI18n()

/** 指针移出后延迟关闭的时间（ms） */
const HOVER_CLOSE_DELAY = 150
/** 快速选页条最多同时显示的页码数量（需求：最多 5 个，含当前页） */
const VISIBLE_PAGE_COUNT = 5

const popoverId = `color-pager-${useId()}`

const rootEl = ref<HTMLDivElement | null>(null)
const triggerEl = ref<HTMLButtonElement | null>(null)
const popoverEl = ref<HTMLDivElement | null>(null)
const stripEl = ref<HTMLDivElement | null>(null)

const isOpen = ref(false)
const hovering = ref(false)
/** 正在编辑的页码（该位置渲染输入框）；null 表示没有输入框 */
const editingPage = ref<number | null>(null)
const inputValue = ref('')

let closeTimer: ReturnType<typeof setTimeout> | undefined
/** Esc 关闭后把焦点还给触发器时，跳过由此产生的 focusin 重开 */
let suppressFocusOpen = false

const totalPages = computed(() => Math.max(1, Math.round(props.pageCount) || 1))

/** 显示用当前页：始终夹在 1..totalPages（props.page 越界时先把显示收好） */
const currentPage = computed(() => clampPage(props.page))

const indicator = computed(() =>
  t('colorPicker.pageIndicator', { page: currentPage.value, total: totalPages.value }),
)

/**
 * 快速选页条窗口起点：当前页居中，两端夹紧，保证窗口内最多 5 个页码且包含当前页。
 * start = clamp(page - 2, 1, max(1, pageCount - 4))
 */
const windowStart = computed(() => {
  const maxStart = Math.max(1, totalPages.value - (VISIBLE_PAGE_COUNT - 1))
  return Math.min(Math.max(currentPage.value - 2, 1), maxStart)
})

const visiblePages = computed(() => {
  const pages: number[] = []
  const end = Math.min(totalPages.value, windowStart.value + VISIBLE_PAGE_COUNT - 1)
  for (let page = windowStart.value; page <= end; page += 1) pages.push(page)
  return pages
})

/** 把任意页码收敛到 1..totalPages */
function clampPage(value: number): number {
  const rounded = Math.round(value)
  if (!Number.isFinite(rounded)) return 1
  return Math.min(Math.max(rounded, 1), totalPages.value)
}

function cancelCloseTimer() {
  if (closeTimer === undefined) return
  clearTimeout(closeTimer)
  closeTimer = undefined
}

function isFocusInside(): boolean {
  const root = rootEl.value
  return root !== null && root.contains(document.activeElement)
}

function openPopover() {
  cancelCloseTimer()
  isOpen.value = true
}

/** 关闭浮层；restoreFocus 为 true 且焦点在浮层内时，把焦点还给触发器 */
function closePopover(restoreFocus = false) {
  cancelCloseTimer()
  if (!isOpen.value) return

  const focusInPopover = popoverEl.value?.contains(document.activeElement) ?? false
  isOpen.value = false
  cancelEdit(false)
  if (!restoreFocus || !focusInPopover) return

  const trigger = triggerEl.value
  if (!trigger) return
  suppressFocusOpen = true
  trigger.focus({ preventScroll: true })
  // focusin 是同步触发的，这里只是兜底：万一没有触发 focusin，也不能把标志留在 true
  queueMicrotask(() => {
    suppressFocusOpen = false
  })
}

function scheduleClose() {
  cancelCloseTimer()
  closeTimer = setTimeout(() => {
    closeTimer = undefined
    // 指针已移出，但键盘焦点还在组件内时不收起（输入框 / 键盘翻页时不能被打断）
    if (hovering.value || isFocusInside()) return
    closePopover()
  }, HOVER_CLOSE_DELAY)
}

function onPointerEnter() {
  hovering.value = true
  openPopover()
}

function onPointerLeave() {
  hovering.value = false
  scheduleClose()
}

function onFocusIn() {
  if (suppressFocusOpen) {
    suppressFocusOpen = false
    return
  }
  openPopover()
}

function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (next instanceof Node && rootEl.value?.contains(next)) return
  // 鼠标还悬停在组件上时先不关（可能只是 Tab 走了）
  if (!hovering.value) closePopover()
}

/** Esc：不论焦点在触发器、浮层还是仅鼠标悬浮，都收起浮层；焦点在浮层内时还给触发器 */
function onWindowKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  closePopover(true)
}

function go(target: number) {
  const next = clampPage(target)
  cancelEdit(false)
  if (next !== props.page) emit('update:page', next)
}

function beginEdit(target: number) {
  if (editingPage.value === target) return
  editingPage.value = target
  inputValue.value = String(target)
  void nextTick(() => {
    const input = stripEl.value?.querySelector<HTMLInputElement>('.pager-input')
    input?.focus({ preventScroll: true })
    input?.select()
  })
}

/**
 * 点击页码：只有当前选中页才弹出输入框；未选中页直接跳页。
 * （需求：未选中页面不许弹出输入框）
 */
function onPageClick(target: number) {
  if (target === currentPage.value) beginEdit(target)
  else go(target)
}

/** Enter / blur 提交：非法输入视为取消；超出范围夹紧到 1..pageCount */
function commitEdit() {
  const editing = editingPage.value
  if (editing === null) return
  editingPage.value = null
  const parsed = Number.parseInt(inputValue.value, 10)
  inputValue.value = ''
  if (!Number.isFinite(parsed)) return

  const next = clampPage(parsed)
  if (next !== props.page) emit('update:page', next)
}

/** Esc 取消编辑（恢复原页码，不 emit）；restoreFocus 时焦点回到原页码按钮 */
function cancelEdit(restoreFocus: boolean) {
  const page = editingPage.value
  if (page === null) return
  editingPage.value = null
  inputValue.value = ''
  if (!restoreFocus) return
  void nextTick(() => {
    stripEl.value
      ?.querySelector<HTMLButtonElement>(`[data-pager-page="${page}"]`)
      ?.focus({ preventScroll: true })
  })
}

// 外部 page / pageCount 变化：输入框里的页码已无意义，直接收起输入框
watch(
  () => [props.page, totalPages.value] as const,
  () => cancelEdit(false),
  { flush: 'post' },
)

// page 越界（如 0、负数、超过总页数）时 emit 夹紧值；父组件受控时会在下一拍更新
watch(
  () => [props.page, totalPages.value] as const,
  ([page]) => {
    const clamped = clampPage(page)
    if (clamped !== Math.round(page)) emit('update:page', clamped)
  },
  { immediate: true },
)

// 浮层打开期间监听全局 Esc：鼠标悬浮打开时焦点可能不在组件内，root 上的 keydown 收不到
watch(isOpen, (open) => {
  if (open) window.addEventListener('keydown', onWindowKeydown)
  else window.removeEventListener('keydown', onWindowKeydown)
})

onBeforeUnmount(() => {
  cancelCloseTimer()
  window.removeEventListener('keydown', onWindowKeydown)
})
</script>

<template>
  <div
    ref="rootEl"
    class="color-pager"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <button
      ref="triggerEl"
      type="button"
      tabindex="0"
      class="pager-trigger"
      :aria-label="indicator"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? popoverId : undefined"
      @click="openPopover"
    >
      {{ indicator }}
    </button>

    <Transition name="pager-pop">
      <div
        v-if="isOpen"
        :id="popoverId"
        ref="popoverEl"
        class="pager-popover"
        data-color-pager-popover
        role="group"
        :aria-label="indicator"
      >
        <div ref="stripEl" class="pager-strip">
          <button
            type="button"
            class="pager-strip__arrow"
            :disabled="currentPage <= 1"
            :aria-label="t('colorPicker.prevPage')"
            @click="go(currentPage - 1)"
          >
            <svg class="pager-strip__arrow-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M9.5 3.5 5.5 8 9.5 12.5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <template v-for="pageNumber in visiblePages" :key="pageNumber">
            <input
              v-if="editingPage === pageNumber"
              v-model="inputValue"
              type="number"
              min="1"
              :max="totalPages"
              class="pager-input"
              :aria-label="t('colorPicker.pageInput')"
              @blur="commitEdit"
              @keydown.enter.prevent="commitEdit"
              @keydown.esc.stop.prevent="cancelEdit(true)"
            />
            <button
              v-else
              type="button"
              class="pager-page"
              :class="{ 'pager-page--active': pageNumber === currentPage }"
              :data-pager-page="pageNumber"
              :aria-current="pageNumber === currentPage ? 'page' : undefined"
              :aria-label="
                pageNumber === currentPage
                  ? indicator
                  : t('colorPicker.pageJump', { page: pageNumber })
              "
              @click="onPageClick(pageNumber)"
            >
              {{ pageNumber }}
            </button>
          </template>

          <button
            type="button"
            class="pager-strip__arrow"
            :disabled="currentPage >= totalPages"
            :aria-label="t('colorPicker.nextPage')"
            @click="go(currentPage + 1)"
          >
            <svg class="pager-strip__arrow-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M6.5 3.5 10.5 8 6.5 12.5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.color-pager {
  position: relative;
  display: inline-flex;
  justify-content: center;
}

/* 常驻触发器：slate 胶囊 */
.pager-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background-color: var(--color-slate-100);
  color: var(--color-slate-500);
  font: inherit;
  font-size: 12px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background-color 0.12s ease,
    color 0.12s ease;
}

.pager-trigger:hover,
.pager-trigger[aria-expanded='true'] {
  background-color: var(--color-slate-200);
  color: #334155;
}

.pager-trigger:active {
  background-color: var(--color-slate-300);
}

.pager-trigger:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
}

/*
 * 悬浮容器：不画背景，只负责定位与 hover 区域（现在只包含快速选页条）。
 */
.pager-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  z-index: 80;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transform: translateX(-50%);
  transform-origin: center bottom;
  will-change: opacity, transform;
}

/* 下层快速选页条：独立视觉，slate-100 胶囊底 */
.pager-strip {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 999px;
  background-color: var(--color-slate-100);
}

.pager-strip__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background-color: transparent;
  color: var(--color-slate-500);
  cursor: pointer;
  transition:
    background-color 0.12s ease,
    color 0.12s ease,
    opacity 0.12s ease;
}

.pager-strip__arrow:hover:not(:disabled) {
  background-color: var(--color-slate-200);
  color: #334155;
}

.pager-strip__arrow:active:not(:disabled) {
  background-color: var(--color-slate-300);
}

.pager-strip__arrow:disabled {
  opacity: 0.35;
  cursor: default;
}

.pager-strip__arrow:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 1px;
}

.pager-strip__arrow-icon {
  display: block;
  width: 10px;
  height: 10px;
}

.pager-page {
  min-width: 26px;
  height: 22px;
  padding: 0 6px;
  border: 0;
  border-radius: 999px;
  background-color: transparent;
  color: var(--color-slate-500);
  font: inherit;
  font-size: 12px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background-color 0.12s ease,
    color 0.12s ease;
}

.pager-page:hover {
  background-color: var(--color-slate-200);
  color: #1e293b;
}

.pager-page--active,
.pager-page--active:hover {
  background-color: var(--color-accent-60);
  color: #ffffff;
}

.pager-page:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 1px;
}

/* 就地把页码按钮换成输入框（宽 40px） */
.pager-input {
  width: 40px;
  height: 22px;
  padding: 0 4px;
  border: 1px solid var(--color-accent-60);
  border-radius: 6px;
  background-color: #ffffff;
  color: #0f172a;
  font: inherit;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  outline: none;
  appearance: textfield;
  -moz-appearance: textfield;
}

/* 隐藏 number 输入框的上下箭头 */
.pager-input::-webkit-outer-spin-button,
.pager-input::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

.pager-pop-enter-active,
.pager-pop-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.pager-pop-enter-from,
.pager-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

@media (prefers-reduced-motion: reduce) {
  .pager-pop-enter-active,
  .pager-pop-leave-active,
  .pager-trigger,
  .pager-strip__arrow,
  .pager-page {
    transition-duration: 0.001ms;
  }
}
</style>
