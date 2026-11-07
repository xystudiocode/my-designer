<script setup lang="ts">
/**
 * 颜色卡片：从通用卡片外壳 `Card.vue` 派生的展示型卡片。
 *
 * - 顶部横向：左侧 64×64 颜色展示（带透明度时透出棋盘格），右侧信息区
 *   （可选颜色名 → 可选「简写」复制框 → 必选「HEX」复制框）。
 * - 底部右侧「更多」：弹出 Teleport 到 body 的浮层，列出 8 种格式（整行可点击复制），
 *   分割线后是「在颜色选择器中打开」（携带当前颜色 / 不透明度 / 模式跳转）。
 *
 * 两套变体共用同一个组件：`shorthand` 是可选参数，不传时只渲染 HEX 复制框。
 * 复制文本框、CopyIcon 动画、浮层行样式均与颜色选择器里的
 * ColorUnits.vue / ColorAssistant.vue 保持一致。
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import Card from '@/components/Card.vue'
import CopyIcon from '@/views/card/color-picker/CopyIcon.vue'
import { copyText } from '@/views/card/color-picker/clipboard'
import {
  colorCss,
  formatColor,
  formatColorEntries,
  type ColorFormat,
  type FormattedColorEntry,
  type RgbColor,
} from '@/views/card/color-picker/color'
import { buildColorPickerLocation } from '@/views/card/color-picker/pickerState'

// ColorCard.vue —— defineProps 增加 origin
const props = withDefaults(
  defineProps<{
    rgb: RgbColor
    alpha?: number
    shorthand?: string
    name?: string
    mode?: ColorFormat
    origin?: string
    transparent?: boolean
  }>(),
  { alpha: 100, mode: 'rgb', origin: 'center', transparent: false },
)

const { t } = useI18n()
const router = useRouter()

/** 复制成功后图标恢复的延迟（ms），与颜色选择器一致 */
const COPY_RESET_DELAY = 2000
/** 浮层与「更多」按钮之间的间距（px） */
const POPOVER_GAP = 8
/** 浮层与视口边缘的最小距离（px） */
const VIEWPORT_MARGIN = 8

/** 每个 ColorCard 实例独立的浮层 id（aria-controls 用） */
const popoverId = `color-card-more-${useId()}`

/** 固定展示的复制框（简写可选 + HEX 必选） */
type FixedCopyKey = 'shorthand' | 'hex'

interface FixedCopyField {
  key: FixedCopyKey
  label: string
  value: string
}

// 色块：transparent 时不画填充层，棋盘格直接透出
const overlayColor = computed(() =>
  props.transparent ? 'transparent' : colorCss(props.rgb, props.alpha),
)

// HEX 框：transparent 直接显示 CSS 关键字，而不是 #00000000
const hexValue = computed(() =>
  props.transparent ? 'transparent' : formatColor(props.rgb, props.alpha, 'hex'),
)

// 8 种格式：transparent 没有「格式」之分，返回空数组，浮层里隐藏这段列表
const formatEntries = computed<FormattedColorEntry[]>(() =>
  props.transparent ? [] : formatColorEntries(props.rgb, props.alpha),
)
const fixedFields = computed<FixedCopyField[]>(() => {
  const fields: FixedCopyField[] = []
  // 透明模式不显示「简写」框：shorthand 就是 'transparent'，与 HEX 框内容重复
  if (props.shorthand && !props.transparent) {
    fields.push({ key: 'shorthand', label: t('colorPicker.shorthand'), value: props.shorthand })
  }
  fields.push({ key: 'hex', label: 'HEX', value: hexValue.value })
  return fields
})

/* ------------------------------- 复制（固定框） ------------------------------- */

const copiedBoxes = ref(new Set<FixedCopyKey>())
const boxTimers = new Map<FixedCopyKey, ReturnType<typeof setTimeout>>()

function markBoxCopied(key: FixedCopyKey) {
  const pending = boxTimers.get(key)
  if (pending !== undefined) clearTimeout(pending)

  copiedBoxes.value.add(key)
  boxTimers.set(
    key,
    setTimeout(() => {
      boxTimers.delete(key)
      copiedBoxes.value.delete(key)
    }, COPY_RESET_DELAY),
  )
}

/** 复制简写 / HEX 文本；复制失败（如权限受限）时不播放成功动画 */
async function copyBox(field: FixedCopyField) {
  const copied = await copyText(field.value)
  if (copied) markBoxCopied(field.key)
}

/* ------------------------------- 复制（浮层行） ------------------------------- */

const isOpen = ref(false)
const moreButton = ref<HTMLButtonElement | null>(null)
const popoverEl = ref<HTMLElement | null>(null)
const popoverStyle = ref<CSSProperties>({})

const copiedFormats = ref(new Set<ColorFormat>())
const formatTimers = new Map<ColorFormat, ReturnType<typeof setTimeout>>()

function markFormatCopied(format: ColorFormat) {
  const pending = formatTimers.get(format)
  if (pending !== undefined) clearTimeout(pending)

  copiedFormats.value.add(format)
  formatTimers.set(
    format,
    setTimeout(() => {
      formatTimers.delete(format)
      copiedFormats.value.delete(format)
    }, COPY_RESET_DELAY),
  )
}

async function copyFormat(entry: FormattedColorEntry) {
  const copied = await copyText(entry.value)
  // 复制期间浮层可能已关闭，此时不再展示成功动画
  if (!copied || !isOpen.value) return
  markFormatCopied(entry.format)
}

/** 清理浮层里的复制状态与计时器（关闭浮层时调用） */
function clearFormatCopyState() {
  for (const timer of formatTimers.values()) clearTimeout(timer)
  formatTimers.clear()
  copiedFormats.value.clear()
}

/* -------------------------------- 浮层定位 / 开关 -------------------------------- */

/** 当前卡片根元素（Card.vue 的 .card-base）：悬浮缩放时会移动锚点，需要重新定位 */
let cardEl: HTMLElement | null = null
let globalListenersAttached = false

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/**
 * 重新计算浮层位置（fixed 定位）：
 * - 水平：右边界与「更多」按钮右边界对齐，放不下时夹紧到视口内；
 * - 垂直：优先按钮下方，放不下翻到上方，都放不下就夹紧。
 */
function placePopover() {
  const anchor = moreButton.value
  const popover = popoverEl.value
  if (!anchor || !popover) return

  const anchorRect = anchor.getBoundingClientRect()
  const width = popover.offsetWidth
  const height = popover.offsetHeight
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const maxLeft = viewportWidth - width - VIEWPORT_MARGIN
  const maxTop = viewportHeight - height - VIEWPORT_MARGIN

  const left = clampNumber(anchorRect.right - width, VIEWPORT_MARGIN, maxLeft)

  let top: number
  let originY: 'top' | 'bottom' = 'top'
  if (anchorRect.bottom + POPOVER_GAP + height <= viewportHeight - VIEWPORT_MARGIN) {
    top = anchorRect.bottom + POPOVER_GAP
  } else if (anchorRect.top - POPOVER_GAP - height >= VIEWPORT_MARGIN) {
    top = anchorRect.top - POPOVER_GAP - height
    originY = 'bottom'
  } else {
    top = anchorRect.top
  }
  top = clampNumber(top, VIEWPORT_MARGIN, maxTop)

  popoverStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    transformOrigin: `right ${originY}`,
  }
}

function attachGlobalListeners() {
  if (globalListenersAttached) return
  globalListenersAttached = true
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  window.addEventListener('keydown', onWindowKeydown)
  // 捕获阶段监听滚动，可捕获任意滚动容器的 scroll 事件
  window.addEventListener('scroll', closePopover, true)
  window.addEventListener('resize', closePopover)
  // 卡片悬浮 / 聚焦时会 scale(1.05)，锚点按钮的实际位置随之变化：
  // 缩放动画结束后重新贴靠按钮（fixed 浮层不会跟随 transform）。
  cardEl = moreButton.value?.closest('.card-base') ?? null
  cardEl?.addEventListener('transitionend', onCardTransitionEnd)
}

function detachGlobalListeners() {
  if (!globalListenersAttached) return
  globalListenersAttached = false
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  window.removeEventListener('keydown', onWindowKeydown)
  window.removeEventListener('scroll', closePopover, true)
  window.removeEventListener('resize', closePopover)
  cardEl?.removeEventListener('transitionend', onCardTransitionEnd)
  cardEl = null
}

function closePopover() {
  if (!isOpen.value) return
  const anchor = moreButton.value
  // 焦点在浮层里时（Esc / 点外关闭），把焦点还给触发它的「更多」按钮
  const restoreFocus = popoverEl.value?.contains(document.activeElement) ?? false
  isOpen.value = false
  detachGlobalListeners()
  clearFormatCopyState()
  if (restoreFocus) anchor?.focus({ preventScroll: true })
}

function togglePopover() {
  // 再次点击「更多」：收回
  if (isOpen.value) {
    closePopover()
    return
  }

  isOpen.value = true
  attachGlobalListeners()
  // 等浮层挂载后按真实尺寸定位，并把焦点移到第一个复制按钮（dialog 语义）
  void nextTick(() => {
    placePopover()
    popoverEl.value?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
  })
}

function onDocumentPointerDown(event: Event) {
  if (!isOpen.value) return
  const target = event.target
  if (!(target instanceof Element)) return
  // 浮层内部点击交给自身处理
  if (popoverEl.value?.contains(target)) return
  // 「更多」按钮：交给 click 事件切换收起
  if (moreButton.value?.contains(target)) return
  closePopover()
}

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  closePopover()
}

function onCardTransitionEnd(event: TransitionEvent) {
  if (event.propertyName !== 'transform') return
  placePopover()
}

/** 在颜色选择器中打开：颜色 / 不透明度 / 模式全部带进 query */
function openInPicker() {
  closePopover()
  void router.push(buildColorPickerLocation(props.rgb, props.alpha, props.mode))
}

/* 颜色 / 模式变化后浮层内容已失效，直接关闭 */
watch(
  () => [props.transparent, props.alpha, props.mode, props.rgb.r, props.rgb.g, props.rgb.b],
  () => closePopover(),
)

/** 读屏播报（视觉上隐藏） */
const copiedAnnouncement = computed(() =>
  copiedBoxes.value.size > 0 || copiedFormats.value.size > 0 ? t('colorPicker.copied') : '',
)

onBeforeUnmount(() => {
  detachGlobalListeners()
  clearFormatCopyState()
  for (const timer of boxTimers.values()) clearTimeout(timer)
  boxTimers.clear()
})
</script>

<template>
  <Card :origin="origin">
    <div class="color-card">
      <div class="color-card__top">
        <!-- 64×64 颜色展示：棋盘格 + 当前颜色覆盖层（带透明度时透出） -->
        <div class="color-card__swatch" role="img" :aria-label="t('colorPicker.displayColor')">
          <div class="color-card__swatch-fill" :style="{ backgroundColor: overlayColor }"></div>
        </div>

        <div class="color-card__info">
          <h3 v-if="name" class="color-card__name">
            <span class="sr-only">{{ t('colorPicker.colorName') }}</span
            >{{ name }}
          </h3>

          <div v-for="field in fixedFields" :key="field.key" class="color-card__field">
            <div class="mb-1 text-sm leading-5 text-slate-700">{{ field.label }}</div>
            <div
              role="button"
              tabindex="0"
              class="flex cursor-pointer select-none items-center justify-between gap-2 rounded-[4px] bg-slate-200 p-3 transition-colors hover:bg-slate-300 active:bg-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-60"
              :aria-label="`${t('colorPicker.copy')} ${field.label}`"
              @click="copyBox(field)"
              @keydown.enter.prevent="copyBox(field)"
              @keydown.space.prevent="copyBox(field)"
            >
              <span class="min-w-0 break-words text-xs leading-[1.4] text-slate-700">
                {{ field.value }}
              </span>
              <button
                type="button"
                class="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center bg-transparent text-zinc-800"
                :aria-label="
                  copiedBoxes.has(field.key)
                    ? t('colorPicker.copied')
                    : `${t('colorPicker.copy')} ${field.label}`
                "
                @click.stop="copyBox(field)"
              >
                <CopyIcon :copied="copiedBoxes.has(field.key)" :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="color-card__footer">
        <button
          ref="moreButton"
          type="button"
          class="color-card__more"
          :class="{ 'color-card__more--open': isOpen }"
          :aria-expanded="isOpen"
          :aria-controls="isOpen ? popoverId : undefined"
          aria-haspopup="dialog"
          @click="togglePopover"
        >
          <span>{{ t('colorPicker.more') }}</span>
          <svg class="color-card__chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="m4 6 4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <span class="sr-only" role="status" aria-live="polite">{{ copiedAnnouncement }}</span>
    </div>

    <Teleport to="body">
      <Transition name="card-more-pop">
        <div
          v-if="isOpen"
          :id="popoverId"
          ref="popoverEl"
          class="card-more-popover fixed z-[150] rounded-lg bg-slate-100 p-1"
          :style="popoverStyle"
          role="dialog"
          :aria-label="`${t('colorPicker.more')} ${hexValue}`"
          @pointerdown.stop
          @click.stop
        >
          <ul v-if="formatEntries.length" class="m-0 list-none p-0">
            <li
              v-for="entry in formatEntries"
              :key="entry.format"
              class="card-more-row flex h-7 cursor-pointer items-center gap-2 rounded-[4px] px-2 text-[11px] hover:bg-slate-200 active:bg-gray-200"
              @click="copyFormat(entry)"
            >
              <span class="w-11 shrink-0 font-medium text-slate-500">{{ entry.label }}</span>
              <span
                class="min-w-0 flex-1 truncate text-slate-700 tabular-nums"
                :title="entry.value"
              >
                {{ entry.value }}
              </span>
              <button
                type="button"
                class="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center bg-transparent text-zinc-800"
                :aria-label="
                  copiedFormats.has(entry.format)
                    ? `${t('colorPicker.copied')} ${entry.label}`
                    : `${t('colorPicker.copy')} ${entry.label}`
                "
                @click="copyFormat(entry)"
              >
                <CopyIcon :copied="copiedFormats.has(entry.format)" :size="14" />
              </button>
            </li>
          </ul>

          <div v-if="formatEntries.length" class="card-more-divider" aria-hidden="true"></div>

          <button
            type="button"
            class="flex h-7 w-full cursor-pointer items-center justify-between gap-2 rounded-[4px] px-2 text-[11px] text-slate-700 hover:bg-slate-200 active:bg-gray-200"
            @click="openInPicker"
          >
            <span class="truncate">{{ t('colorPicker.openInPicker') }}</span>
            <svg
              class="h-3 w-3 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M14 3h7v7" />
              <path d="M10 14 21 3" />
              <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
            </svg>
          </button>
        </div>
      </Transition>
    </Teleport>
  </Card>
</template>

<style scoped>
.color-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-card__top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

/* 8px 方格棋盘格（与 DisplayColor.vue 一致）：颜色带透明度时透出 */
.color-card__swatch {
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  overflow: hidden;

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
}

.color-card__swatch-fill {
  width: 100%;
  height: 100%;
}

.color-card__info {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.color-card__name {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: break-word;
}

.color-card__field {
  min-width: 0;
}

.color-card__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
}

/* 「更多」按钮：低调的文字按钮，悬浮 / 展开时加浅灰底 */
.color-card__more {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border: 0;
  border-radius: 4px;
  background-color: transparent;
  color: #64748b;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.color-card__more:hover,
.color-card__more--open {
  background-color: #f1f5f9;
  color: #334155;
}

.color-card__more:active {
  background-color: #e2e8f0;
}

.color-card__more:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
}

.color-card__chevron {
  width: 12px;
  height: 12px;
  transition: transform 0.18s ease;
}

.color-card__more--open .color-card__chevron {
  transform: rotate(180deg);
}

/* Teleport 出去的浮层：宽度固定上限，窄屏时收窄到视口内 */
.card-more-popover {
  width: min(340px, calc(100vw - 16px));
  box-shadow:
    0 12px 28px -10px rgb(15 23 42 / 0.32),
    0 4px 10px -4px rgb(15 23 42 / 0.18);
  will-change: opacity, transform;
}

/* 8 种格式与「在颜色选择器中打开」之间的分割线 */
.card-more-divider {
  height: 1px;
  margin: 4px 8px;
  background-color: #e5e7eb;
}

.card-more-pop-enter-active,
.card-more-pop-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.card-more-pop-enter-from,
.card-more-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .card-more-pop-enter-active,
  .card-more-pop-leave-active,
  .color-card__chevron,
  .color-card__more {
    transition-duration: 0.001ms;
  }
}
</style>
