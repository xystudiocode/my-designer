<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LANGUAGE_OPTIONS, useLocaleStore, type LocalePreference } from '@/stores/locale'
import { useI18n } from '@/i18n'

const localeStore = useLocaleStore()
const { t } = useI18n()

const scroller = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)

const hasOverflow = ref(false)
const thumbWidth = ref(0)
const thumbOffset = ref(0)

/** 渲染用的选项列表：「跟随浏览器」固定在最左，其余为母语原文的语言名称 */
const options = computed<{ value: LocalePreference; label: string }[]>(() => [
  { value: 'browser', label: t('language.browserSettings') },
  ...LANGUAGE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
])

function select(preference: LocalePreference) {
  localeStore.setPreference(preference)
}

/** 左右方向键在选项之间移动，符合 radiogroup 的交互习惯 */
function moveSelection(step: number) {
  const list = options.value
  const current = list.findIndex((option) => option.value === localeStore.preference)
  const nextIndex = (current + step + list.length) % list.length
  const next = list[nextIndex]
  if (!next) return

  localeStore.setPreference(next.value)
  nextTick(() => {
    scroller.value?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus()
  })
}

/** 选中项可能被横向滚动条挡在视口外，切换后把它滚动到可见区域 */
async function scrollSelectedIntoView() {
  await nextTick()
  scroller.value
    ?.querySelector<HTMLElement>('[aria-checked="true"]')
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

/** 同步「四像素胶囊」滚动条：溢出时才显示，并跟随 scrollLeft 移动 */
function syncScrollbar() {
  const scrollerEl = scroller.value
  if (!scrollerEl) return

  const maxScroll = scrollerEl.scrollWidth - scrollerEl.clientWidth
  hasOverflow.value = maxScroll > 1
  if (!hasOverflow.value) {
    thumbWidth.value = 0
    thumbOffset.value = 0
    return
  }

  // 轨道由 v-show 控制显隐，刚出现时宽度为 0，下一帧再量
  const trackWidth = track.value?.clientWidth ?? 0
  if (trackWidth === 0) {
    nextTick(syncScrollbar)
    return
  }

  const width = Math.min(
    Math.max((scrollerEl.clientWidth / scrollerEl.scrollWidth) * trackWidth, 24),
    trackWidth,
  )
  const maxThumbOffset = Math.max(trackWidth - width, 0)
  thumbWidth.value = width
  thumbOffset.value =
    maxThumbOffset === 0 ? 0 : (scrollerEl.scrollLeft / maxScroll) * maxThumbOffset
}

// —— 自定义滚动条拖拽 ——
let dragging = false
let dragStartX = 0
let dragStartScrollLeft = 0

function onThumbPointerDown(event: PointerEvent) {
  const scrollerEl = scroller.value
  if (!scrollerEl) return

  dragging = true
  dragStartX = event.clientX
  dragStartScrollLeft = scrollerEl.scrollLeft
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onThumbPointerMove(event: PointerEvent) {
  const scrollerEl = scroller.value
  const trackEl = track.value
  if (!dragging || !scrollerEl || !trackEl) return

  const maxScroll = scrollerEl.scrollWidth - scrollerEl.clientWidth
  const maxThumbOffset = Math.max(trackEl.clientWidth - thumbWidth.value, 0)
  if (maxThumbOffset <= 0) return

  scrollerEl.scrollLeft =
    dragStartScrollLeft + ((event.clientX - dragStartX) / maxThumbOffset) * maxScroll
}

function onThumbPointerUp() {
  dragging = false
}

/** 点击/拖拽轨道空白处：滑块中心跳到指针位置 */
function onTrackPointerDown(event: PointerEvent) {
  const scrollerEl = scroller.value
  const trackEl = track.value
  if (!scrollerEl || !trackEl) return

  const rect = trackEl.getBoundingClientRect()
  const maxThumbOffset = Math.max(rect.width - thumbWidth.value, 0)
  if (maxThumbOffset <= 0) return

  const x = Math.min(Math.max(event.clientX - rect.left - thumbWidth.value / 2, 0), maxThumbOffset)
  scrollerEl.scrollLeft = (x / maxThumbOffset) * (scrollerEl.scrollWidth - scrollerEl.clientWidth)
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  scrollSelectedIntoView()
  syncScrollbar()
  resizeObserver = new ResizeObserver(() => syncScrollbar())
  if (scroller.value) resizeObserver.observe(scroller.value)
  if (menu.value) resizeObserver.observe(menu.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())

// 「浏览器设置」的文案会随语言变化，宽度变化后需要重新计算滚动条
watch(
  () => options.value.map((option) => option.label).join('|'),
  () => nextTick(syncScrollbar),
)
watch(() => localeStore.preference, scrollSelectedIntoView)
</script>

<template>
  <!--
    标题栏胶囊语言选择框
    · 字体 12px、选中加粗；默认黑字、选中白字
    · 背景：默认 accent-90、悬浮 accent-85、选中 accent-60、选中且悬浮 accent-70
    · 最宽 200px，超出后出现 4px 高的横向滚动条
    · 碰撞箱：命中区上下各比胶囊外扩 8px；最左/最右选项再向左右各外扩 4px
  -->
  <div class="lang-selector relative w-max max-w-[458px]">
    <div
      ref="scroller"
      role="radiogroup"
      :aria-label="t('language.selectorLabel')"
      class="lang-scroller flex h-10 w-full items-center overflow-x-auto overflow-y-hidden px-1"
      @scroll="syncScrollbar"
    >
      <!-- 内容行（40px 高 = 24px 胶囊 + 上下各 8px 碰撞箱）；选项之间 0 gap -->
      <div ref="menu" class="lang-menu relative flex h-10 w-max items-center">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="localeStore.preference === option.value"
          :tabindex="localeStore.preference === option.value ? 0 : -1"
          class="lang-option relative flex h-10 shrink-0 cursor-pointer items-center justify-center px-2 text-xs leading-4 whitespace-nowrap"
          @click="select(option.value)"
          @keydown.left.prevent="moveSelection(-1)"
          @keydown.right.prevent="moveSelection(1)"
        >
          <span
            class="lang-option__bg pointer-events-none absolute inset-x-0 inset-y-2 rounded-full transition-colors duration-150"
            aria-hidden="true"
          ></span>
          <span class="lang-option__label relative z-10 transition-colors duration-150">{{
            option.label
          }}</span>
        </button>
      </div>
    </div>

    <!-- 横向滚动条（4px 胶囊滑块，超出 200px 时出现；位于碰撞箱下方，不占用命中区） -->
    <div
      v-show="hasOverflow"
      ref="track"
      aria-hidden="true"
      class="lang-scrollbar absolute inset-x-1 -bottom-1 h-1 cursor-pointer"
      @pointerdown="onTrackPointerDown"
    >
      <div
        class="lang-scrollbar__thumb absolute inset-y-0 left-0 touch-none rounded-full bg-accent-75"
        :style="{ width: `${thumbWidth}px`, transform: `translateX(${thumbOffset}px)` }"
        @pointerdown.stop="onThumbPointerDown"
        @pointermove="onThumbPointerMove"
        @pointerup="onThumbPointerUp"
        @pointercancel="onThumbPointerUp"
      ></div>
    </div>
  </div>
</template>

<style scoped>
/* 隐藏原生滚动条，改用下面的 4px 胶囊滚动条，避免挤占碰撞箱高度 */
.lang-scroller {
  scrollbar-width: none;
  /* 左右各 4px 是碰撞箱外扩区：用蒙版裁掉溢出到这里的胶囊底色，保证可见胶囊始终 ≤200px。
     蒙版只影响绘制、不影响命中测试（命中区域仍向左右各外扩 4px）。 */
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0 4px,
    #000 4px calc(100% - 4px),
    transparent calc(100% - 4px)
  );
  mask-image: linear-gradient(
    to right,
    transparent 0 4px,
    #000 4px calc(100% - 4px),
    transparent calc(100% - 4px)
  );
}

.lang-scroller::-webkit-scrollbar {
  display: none;
}

/* 菜单底色：24px 高的胶囊，与选项的状态色叠在一起 */
.lang-menu::before {
  content: '';
  position: absolute;
  inset: 8px 0;
  border-radius: 9999px;
  background-color: var(--color-slate-200);
  pointer-events: none;
}

/* 碰撞箱：最左/最右的选项向左右各外扩 4px，只扩大命中区域，不改变外观 */
.lang-option::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
}

.lang-option:first-child::before {
  left: -4px;
}

.lang-option:last-child::before {
  right: -4px;
}

.lang-option:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: -2px;
  border-radius: 9999px;
}

/* 状态色：默认透出 accent-90 菜单底色；悬浮 accent-85；选中 accent-60；选中且悬浮 accent-70 */
.lang-option__bg {
  background-color: transparent;
}

.lang-option:hover .lang-option__bg {
  background-color: var(--color-slate-300);
}

.lang-option:active .lang-option__bg {
  background-color: var(--color-gray-300);
}

.lang-option[aria-checked='true'] .lang-option__bg {
  background-color: var(--color-accent-60);
}

.lang-option[aria-checked='true']:hover .lang-option__bg {
  background-color: var(--color-accent-70);
}

.lang-option[aria-checked='true']:active .lang-option__bg {
  background-color: var(--color-accent-65);
}

/* 文字：默认黑色，选中白色并加粗 */
.lang-option__label {
  color: #000;
}

.lang-option[aria-checked='true'] .lang-option__label {
  color: #fff;
  font-weight: 700;
}
</style>
