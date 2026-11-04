<script setup lang="ts">
/**
 * 通用下拉选择框（颜色选择器的「选择模式」使用）。
 *
 * 视觉与交互要点：
 * · 触发框：白底、8px 圆角、四边 12px 内边距、14px 文字，右侧自绘 chevron 展开时旋转 180°。
 * · 弹层：绝对定位在触发框下方 8px、与触发框同宽，8px 圆角 + 阴影；弹出/收回约 0.18s 动画。
 * · 选项状态色：默认 slate-100 / 悬浮 slate-200 / 按下 gray-200；
 *   选中 slate-300 / 选中悬浮 slate-400 / 选中按下 gray-400；选项之间 1px gray-200 分割线。
 * · 指示器：菜单里单独一个绝对定位胶囊（4×16px，accent-60），按选中项的位置做 translateY；
 *   因为位置变化只改 transform，所以无论切换跨度多远都是 0.25s。
 *   选中项 padding-left 归零，内部按 [4px 占位][8px 间距][文字] 排列，
 *   与未选中项 12px 的左内边距对齐，文字不会产生缩进。
 * · 交互：点击触发框开关；点击选项后关闭并 emit；点击外部 / Esc 关闭；
 *   键盘 ↑/↓ 移动高亮（高亮项滚动可见、显示 hover 态），Enter 选中，Esc 关闭；打开时高亮当前值。
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

interface SelectOption {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: ReadonlyArray<SelectOption>
    /** 无障碍名称（aria-label） */
    label?: string
  }>(),
  { label: '' },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** 指示器高度（px），与样式保持一致 */
const INDICATOR_HEIGHT = 16

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const list = ref<HTMLElement | null>(null)

const isOpen = ref(false)
/** 指示器当前所在项：打开时是选中项，只有用户点击某个选项后才移动（0.25s 滑动） */
const indicatorIndex = ref(-1)
/** 键盘高亮项（只有键盘导航时高亮背景；鼠标悬浮由 CSS :hover 处理） */
const navIndex = ref(-1)
/** 指示器的 translateY 偏移量（px） */
const indicatorY = ref(0)
/** 首帧测量完成前关闭过渡，避免打开时指示器从顶部滑到目标位置 */
const indicatorReady = ref(false)
/** 选中后延迟收起菜单的计时器：让 0.25s 的指示器移动能被看到 */
let closeTimer: ReturnType<typeof setTimeout> | undefined

/** 指示器滑动时长（与 CSS transition 保持一致） */
const INDICATOR_MOVE_DURATION = 250

const selectedIndex = computed(() =>
  props.options.findIndex((option) => option.value === props.modelValue),
)

const selectedLabel = computed(() => props.options[selectedIndex.value]?.label ?? '')

const indicatorStyle = computed(() => ({
  transform: `translateY(${indicatorY.value}px)`,
  transition: indicatorReady.value ? undefined : 'none',
}))

function optionElements(): HTMLElement[] {
  const listEl = list.value
  if (!listEl) return []
  return Array.from(listEl.querySelectorAll<HTMLElement>('[role="option"]'))
}

/** 把指示器对准当前所在项的垂直中心（偏移量相对菜单内容，跟随滚动） */
function measureIndicator() {
  const item = optionElements()[indicatorIndex.value]
  if (!item) {
    indicatorY.value = 0
    return
  }
  indicatorY.value = item.offsetTop + (item.offsetHeight - INDICATOR_HEIGHT) / 2
}

/** 把某个选项滚动到可见区域（只滚动菜单，不影响页面） */
function scrollOptionIntoView(index: number) {
  const listEl = list.value
  const item = listEl ? optionElements()[index] : undefined
  if (!listEl || !item) return

  const top = item.offsetTop
  const bottom = top + item.offsetHeight
  if (top < listEl.scrollTop) listEl.scrollTop = top
  else if (bottom > listEl.scrollTop + listEl.clientHeight) {
    listEl.scrollTop = bottom - listEl.clientHeight
  }
}

function openMenu() {
  if (isOpen.value || props.options.length === 0) return
  isOpen.value = true
}

function closeMenu(focusTrigger = false) {
  if (!isOpen.value) return
  if (closeTimer !== undefined) {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }
  isOpen.value = false
  if (focusTrigger) trigger.value?.focus()
}

/** 点击某个选项：先移动指示器（0.25s），再收起菜单 */
function choose(index: number) {
  const option = props.options[index]
  if (!option) return
  if (closeTimer !== undefined) clearTimeout(closeTimer)
  indicatorIndex.value = index
  emit('update:modelValue', option.value)
  closeTimer = setTimeout(() => {
    closeTimer = undefined
    closeMenu(true)
  }, INDICATOR_MOVE_DURATION)
}

/** 键盘 ↑/↓：只移动高亮，不移动指示器（指示器只在选择后移动） */
function moveActive(step: number) {
  const total = props.options.length
  if (total === 0) return

  const current = navIndex.value >= 0 ? navIndex.value : selectedIndex.value
  const next =
    current < 0 ? (step > 0 ? 0 : total - 1) : (((current + step) % total) + total) % total
  navIndex.value = next
  void nextTick(() => scrollOptionIntoView(next))
}

/** Enter 选中键盘高亮项（没有键盘高亮时选中当前选中项） */
function selectActive() {
  const index = navIndex.value >= 0 ? navIndex.value : selectedIndex.value
  if (index >= 0) choose(index)
}

function onTriggerClick() {
  if (isOpen.value) closeMenu(true)
  else openMenu()
}

/** 关闭态下的键盘：↑/↓/Enter/Space 打开菜单；打开后交给 document 上的键盘监听 */
function onTriggerKeydown(event: KeyboardEvent) {
  if (isOpen.value) return

  if (
    event.key === 'ArrowDown' ||
    event.key === 'ArrowUp' ||
    event.key === 'Enter' ||
    event.key === ' '
  ) {
    event.preventDefault()
    openMenu()
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!isOpen.value) return
  if (!root.value?.contains(event.target as Node)) closeMenu()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (!isOpen.value) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      moveActive(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveActive(-1)
      break
    case 'Enter':
      event.preventDefault()
      selectActive()
      break
    case 'Escape':
      event.preventDefault()
      closeMenu(true)
      break
  }
}

/** Tab 把焦点移出组件时一并收起菜单 */
function onRootFocusOut(event: FocusEvent) {
  if (!isOpen.value) return
  const next = event.relatedTarget as Node | null
  if (next && root.value?.contains(next)) return
  closeMenu()
}

watch(isOpen, async (open) => {
  if (!open) {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true)
    document.removeEventListener('keydown', onDocumentKeydown)
    return
  }

  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  document.addEventListener('keydown', onDocumentKeydown)

  // 打开时指示器直接落在选中项（不播放滑动）；先关掉过渡，测量完成后再恢复
  indicatorReady.value = false
  navIndex.value = -1
  indicatorIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
  await nextTick()
  measureIndicator()
  scrollOptionIntoView(indicatorIndex.value)
  await nextTick()
  indicatorReady.value = true
})

// 指示器位置变化（只有点击选项后会触发）时 0.25s 滑动到目标项
watch(indicatorIndex, () => {
  if (isOpen.value) void nextTick(measureIndicator)
})

onBeforeUnmount(() => {
  if (closeTimer !== undefined) clearTimeout(closeTimer)
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <div ref="root" class="relative w-full" @focusout="onRootFocusOut">
    <button
      ref="trigger"
      type="button"
      class="select-trigger flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-left text-sm text-slate-900"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-label="label || undefined"
      @click="onTriggerClick"
      @keydown="onTriggerKeydown"
    >
      <span class="min-w-0 flex-1 truncate leading-5">{{ selectedLabel }}</span>
      <svg
        class="select-chevron"
        :class="{ 'select-chevron--open': isOpen }"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4.5 6.25 8 9.75l3.5-3.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <Transition name="select-popup">
      <div
        v-if="isOpen"
        class="select-popup absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-lg bg-slate-100"
      >
        <div
          ref="list"
          class="select-list relative"
          role="listbox"
          :aria-label="label || undefined"
          :aria-activedescendant="navIndex >= 0 ? `select-option-${navIndex}` : undefined"
        >
          <div
            v-for="(option, index) in options"
            :id="`select-option-${index}`"
            :key="option.value"
            class="select-option flex cursor-pointer items-center text-sm text-slate-900"
            :class="{ 'select-option--active': index === navIndex }"
            role="option"
            :aria-selected="index === selectedIndex"
            @mousedown.prevent
            @click="choose(index)"
          >
            <span
              v-if="index === selectedIndex"
              class="select-option__spacer"
              aria-hidden="true"
            ></span>
            <span class="select-option__label">{{ option.label }}</span>
          </div>

          <span
            v-show="selectedIndex >= 0"
            class="select-indicator"
            :style="indicatorStyle"
            aria-hidden="true"
          ></span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ---------- 触发框 ---------- */
.select-trigger {
  outline: none;
}

.select-trigger:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: -2px;
}

.select-chevron {
  width: 16px;
  height: 16px;
  flex: none;
  color: var(--color-slate-500);
  transition: transform 0.2s ease;
}

.select-chevron--open {
  transform: rotate(180deg);
}

/* ---------- 弹层 ---------- */
.select-popup {
  transform-origin: top center;
  box-shadow: 0 8px 24px rgb(15 23 42 / 0.16);
}

.select-popup-enter-active,
.select-popup-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.select-popup-enter-from,
.select-popup-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

.select-list {
  max-height: 320px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--color-slate-400) transparent;
}

.select-list::-webkit-scrollbar {
  width: 6px;
}

.select-list::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background-color: var(--color-slate-400);
}

/* ---------- 选项 ---------- */
.select-option {
  position: relative;
  /* 竖向 padding 6px（横向保持 12px） */
  padding: 6px 12px;
  background-color: var(--color-slate-100);
  transition: background-color 0.15s ease;
}

/* 选项之间的 1px 分割线（最后一项后没有） */
.select-option + .select-option::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 1px;
  background-color: var(--color-gray-200);
  pointer-events: none;
}

.select-option:hover,
.select-option--active {
  background-color: var(--color-slate-200);
}

.select-option:active {
  background-color: var(--color-gray-200);
}

/* 选中项：左侧 padding 归零，由 [4px 占位][8px 间距] 让文字与未选中项对齐 */
.select-option[aria-selected='true'] {
  gap: 8px;
  padding-left: 0;
  background-color: var(--color-slate-300);
}

.select-option[aria-selected='true']:hover,
.select-option[aria-selected='true'].select-option--active {
  background-color: var(--color-slate-400);
}

.select-option[aria-selected='true']:active {
  background-color: var(--color-gray-400);
}

.select-option__spacer {
  width: 4px;
  height: 16px;
  flex: none;
}

.select-option__label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  line-height: 20px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 选中指示器 ---------- */
.select-indicator {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  width: 4px;
  height: 16px;
  border-radius: 9999px;
  background-color: var(--color-accent-60);
  pointer-events: none;
  transition: transform 0.25s ease;
}

@media (prefers-reduced-motion: reduce) {
  .select-popup-enter-active,
  .select-popup-leave-active,
  .select-indicator,
  .select-chevron,
  .select-option {
    transition-duration: 0.001ms;
  }
}
</style>
