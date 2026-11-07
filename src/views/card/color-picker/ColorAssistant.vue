<script setup lang="ts">
/**
 * 配色助手（颜色选择器左列主面板下方的一栏）。
 *
 * - 「基于亮度信息」：以当前颜色亮度为基准，按 5% 一档上下偏移；
 *   亮度夹紧到通道两端后产生的重复项自动去重。
 * - 「所有亮度配色信息」：忽略当前亮度，固定展示 5% - 100% 共 20 档。
 * - 亮度来源取决于当前取色模式：LAB / OKLCH 用 L、YCbCr 用 Y，其余模式（RGB / HSL / HWB / CMYK）
 *   沿用 HSL 亮度；由 `modes.ts` 的 `assistantLightnessPalettes()` 统一计算。
 * - 点击色块（松开）弹出子菜单：展示该色块颜色在 8 种格式下的文本，可逐行复制。
 *   子菜单通过 Teleport 挂到 body 上用 fixed 定位锚定色块，点击外部 / Esc /
 *   窗口滚动 / resize 时关闭。
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useI18n } from '@/i18n'
import {
  colorCss,
  formatColorEntries,
  type ColorFormat,
  type FormattedColorEntry,
  type LightnessSwatch,
  type RgbColor,
} from './color'
import { assistantLightnessPalettes } from './modes'
import CopyIcon from './CopyIcon.vue'
import { copyText } from './clipboard'
import { toStoredColor, type StoredColor } from './pickerState'

const props = defineProps<{
  /** 当前取色模式：决定配色助手亮度色板使用哪种亮度 */
  mode: ColorFormat
  rgb: RgbColor
  alpha: number
}>()

const emit = defineEmits<{
  /** 把子菜单里的色块颜色（沿用当前不透明度）保存到调色板 */
  'save-to-palette': [color: StoredColor]
}>()

const { t } = useI18n()

/** 复制成功后图标恢复的延迟（ms） */
const COPY_RESET_DELAY = 2000
/** 弹层与色块之间的间距（px） */
const POPOVER_GAP = 8
/** 弹层与视口边缘的最小距离（px） */
const VIEWPORT_MARGIN = 8
/** 弹层 dom id，色块的 aria-controls 指向它 */
const POPOVER_ID = 'color-assistant-popover'

/** 配色助手的两套亮度色板：LAB / OKLCH / YCbCr 跟随模式亮度，其它模式用 HSL 亮度 */
const palettes = computed(() => assistantLightnessPalettes(props.mode, props.rgb))
const byLightnessList = computed(() => palettes.value.byLightness)
const allLightnessList = computed(() => palettes.value.allLightness)

/** 当前展开色块的唯一标识：同一色块在「两套色板」中可能重复，需要分组区分 */
const activeKey = ref<string | null>(null)
const activeSwatch = ref<LightnessSwatch | null>(null)

/** 子菜单中的 8 种格式文本（透明度沿用当前颜色） */
const formattedEntries = computed<FormattedColorEntry[]>(() =>
  activeSwatch.value ? formatColorEntries(activeSwatch.value.rgb, props.alpha) : [],
)

const popoverLabel = computed(() =>
  activeSwatch.value ? `${t('colorPicker.assistant')} ${activeSwatch.value.label}` : '',
)

/** 已复制（显示对勾）的格式行，每行独立计时 */
const copiedFormats = ref(new Set<ColorFormat>())
const resetTimers = new Map<ColorFormat, ReturnType<typeof setTimeout>>()

/** 弹层 DOM 引用与位置（fixed 定位） */
const popoverEl = ref<HTMLElement | null>(null)
const popoverStyle = ref<CSSProperties>({})

/** 当前色块按钮（不放进响应式：只用于定位，不参与渲染） */
let activeAnchor: HTMLElement | null = null
let globalListenersAttached = false

function swatchKey(section: 'by' | 'all', index: number): string {
  return `${section}-${index}`
}

function isActive(key: string): boolean {
  return activeKey.value === key
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/**
 * 重新计算弹层位置：
 * - 水平优先色块右侧，放不下再翻到左侧，都放不下就夹紧到视口内；
 * - 垂直优先色块下方，放不下翻到上方，都放不下就夹紧。
 */
function placePopover() {
  const anchor = activeAnchor
  const popover = popoverEl.value
  if (!anchor || !popover) return

  const anchorRect = anchor.getBoundingClientRect()
  const width = popover.offsetWidth
  const height = popover.offsetHeight
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const maxLeft = viewportWidth - width - VIEWPORT_MARGIN
  const maxTop = viewportHeight - height - VIEWPORT_MARGIN

  // 菜单左边界与色块左边界对齐（放不下时夹紧到视口内）
  const left = clampNumber(anchorRect.left, VIEWPORT_MARGIN, maxLeft)

  let top: number
  if (anchorRect.bottom + POPOVER_GAP + height <= viewportHeight - VIEWPORT_MARGIN) {
    top = anchorRect.bottom + POPOVER_GAP
  } else if (anchorRect.top - POPOVER_GAP - height >= VIEWPORT_MARGIN) {
    top = anchorRect.top - POPOVER_GAP - height
  } else {
    top = anchorRect.top
  }
  top = clampNumber(top, VIEWPORT_MARGIN, maxTop)

  popoverStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    transformOrigin: 'left top',
  }
}

/** 复制成功：该行显示对勾，2 秒后单独恢复 */
function markCopied(format: ColorFormat) {
  const pending = resetTimers.get(format)
  if (pending !== undefined) clearTimeout(pending)

  copiedFormats.value.add(format)
  resetTimers.set(
    format,
    setTimeout(() => {
      resetTimers.delete(format)
      copiedFormats.value.delete(format)
    }, COPY_RESET_DELAY),
  )
}

/** 清理所有复制状态与计时器（关闭弹层 / 切换色块 / 卸载时调用） */
function clearCopyState() {
  for (const timer of resetTimers.values()) clearTimeout(timer)
  resetTimers.clear()
  copiedFormats.value.clear()
}

async function handleCopy(entry: FormattedColorEntry) {
  const swatch = activeSwatch.value
  const copied = await copyText(entry.value)
  // 复制期间弹层可能已关闭或切换到别的色块，此时不再展示成功动画
  if (!copied || !swatch || activeSwatch.value !== swatch) return
  markCopied(entry.format)
}

/** 把当前子菜单色块的颜色保存到调色板（不透明度沿用当前值） */
function saveToPalette() {
  const swatch = activeSwatch.value
  if (!swatch) return
  emit('save-to-palette', toStoredColor(swatch.rgb, props.alpha))
  closePopover()
}

function attachGlobalListeners() {
  if (globalListenersAttached) return
  globalListenersAttached = true
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  window.addEventListener('keydown', onWindowKeydown)
  // 捕获阶段监听滚动，可捕获任意滚动容器的 scroll 事件
  window.addEventListener('scroll', closePopover, true)
  window.addEventListener('resize', closePopover)
}

function detachGlobalListeners() {
  if (!globalListenersAttached) return
  globalListenersAttached = false
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  window.removeEventListener('keydown', onWindowKeydown)
  window.removeEventListener('scroll', closePopover, true)
  window.removeEventListener('resize', closePopover)
}

function closePopover() {
  if (!activeSwatch.value && !activeKey.value) return
  const anchor = activeAnchor
  // 焦点在弹层里时（Esc / 点外关闭），把焦点还给触发它的色块
  const restoreFocus = popoverEl.value?.contains(document.activeElement) ?? false
  activeSwatch.value = null
  activeKey.value = null
  activeAnchor = null
  detachGlobalListeners()
  clearCopyState()
  if (restoreFocus) anchor?.focus({ preventScroll: true })
}

function toggleSwatch(event: MouseEvent, key: string, swatch: LightnessSwatch) {
  // 再次点击同一个色块：收回
  if (activeKey.value === key && activeSwatch.value) {
    closePopover()
    return
  }

  const anchor = event.currentTarget
  if (!(anchor instanceof HTMLElement)) return

  activeAnchor = anchor
  activeKey.value = key
  activeSwatch.value = swatch
  clearCopyState()
  attachGlobalListeners()
  // 等弹层挂载后按真实尺寸定位，并把焦点移到第一个复制按钮（dialog 语义）
  void nextTick(() => {
    placePopover()
    popoverEl.value?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
  })
}

function onDocumentPointerDown(event: Event) {
  if (!activeSwatch.value) return
  const target = event.target
  if (!(target instanceof Element)) return
  // 弹层内部点击交给自身处理
  if (popoverEl.value?.contains(target)) return
  // 当前色块：交给 click 事件切换收起
  if (activeAnchor?.contains(target)) return
  // 其他色块：click 事件会切换到新位置，这里不先关闭以免动画闪烁
  if (target.closest('[data-assistant-swatch]')) return
  closePopover()
}

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  closePopover()
}

// 当前颜色 / 不透明度 / 模式变化后色板内容会变，弹层里的旧颜色已失效，直接关闭
watch(
  () => [props.mode, props.alpha, props.rgb.r, props.rgb.g, props.rgb.b],
  () => closePopover(),
)

onBeforeUnmount(() => {
  detachGlobalListeners()
  clearCopyState()
})
</script>

<template>
  <section class="flex min-w-0 flex-col">
    <h2 class="text-[19px] leading-6 font-bold text-slate-900">
      {{ t('colorPicker.assistant') }}
    </h2>
    <p class="mt-1 text-[13px] leading-[18px] text-slate-500">
      {{ t('colorPicker.assistantHint') }}
    </p>

    <p class="mt-2.5 text-[13px] leading-[18px] font-medium text-slate-600">
      {{ t('colorPicker.byLightness') }}
    </p>
    <div class="assistant-grid mt-2" role="group" :aria-label="t('colorPicker.byLightness')">
      <div
        v-for="(swatch, index) in byLightnessList"
        :key="swatchKey('by', index)"
        class="flex select-none flex-col"
      >
        <button
          type="button"
          data-assistant-swatch="true"
          class="assistant-swatch aspect-square w-full cursor-pointer rounded-lg"
          :class="{ 'assistant-swatch--active': isActive(swatchKey('by', index)) }"
          :style="{ backgroundColor: colorCss(swatch.rgb) }"
          :aria-label="swatch.label"
          :aria-expanded="isActive(swatchKey('by', index))"
          :aria-controls="isActive(swatchKey('by', index)) ? POPOVER_ID : undefined"
          aria-haspopup="dialog"
          @click="toggleSwatch($event, swatchKey('by', index), swatch)"
        />
        <span class="mt-1.5 text-center text-[11px] leading-[14px] text-slate-600">
          {{ swatch.label }}
        </span>
      </div>
    </div>

    <p class="mt-5 text-[13px] leading-[18px] font-medium text-slate-600">
      {{ t('colorPicker.allLightness') }}
    </p>
    <div class="assistant-grid mt-2" role="group" :aria-label="t('colorPicker.allLightness')">
      <div
        v-for="(swatch, index) in allLightnessList"
        :key="swatchKey('all', index)"
        class="flex select-none flex-col"
      >
        <button
          type="button"
          data-assistant-swatch="true"
          class="assistant-swatch aspect-square w-full cursor-pointer rounded-lg"
          :class="{ 'assistant-swatch--active': isActive(swatchKey('all', index)) }"
          :style="{ backgroundColor: colorCss(swatch.rgb) }"
          :aria-label="swatch.label"
          :aria-expanded="isActive(swatchKey('all', index))"
          :aria-controls="isActive(swatchKey('all', index)) ? POPOVER_ID : undefined"
          aria-haspopup="dialog"
          @click="toggleSwatch($event, swatchKey('all', index), swatch)"
        />
        <span class="mt-1.5 text-center text-[11px] leading-[14px] text-slate-600">
          {{ swatch.label }}
        </span>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="assistant-pop">
        <div
          v-if="activeSwatch"
          :id="POPOVER_ID"
          ref="popoverEl"
          class="assistant-popover fixed z-[150] rounded-lg bg-slate-100 p-1"
          :style="popoverStyle"
          role="dialog"
          :aria-label="popoverLabel"
          @pointerdown.stop
          @click.stop
        >
          <ul class="m-0 list-none p-0">
            <li
              v-for="entry in formattedEntries"
              :key="entry.format"
              class="assistant-row flex h-7 cursor-pointer items-center gap-2 rounded-[4px] px-2 text-[11px] hover:bg-slate-200 active:bg-gray-200"
              @click="handleCopy(entry)"
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
                @click="handleCopy(entry)"
              >
                <CopyIcon :copied="copiedFormats.has(entry.format)" :size="14" />
              </button>
            </li>
          </ul>

          <div class="assistant-divider" aria-hidden="true"></div>

          <button type="button" class="assistant-save" @click="saveToPalette">
            <svg class="assistant-save__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 3.25v9.5M3.25 8h9.5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
            <span>{{ t('colorPicker.saveToPalette') }}</span>
          </button>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
/* 两套色板都是 10 列；色块最大 40px，容器变窄时按比例收缩 */
.assistant-grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 40px));
  justify-content: start;
  column-gap: 12px;
  row-gap: 16px;
}

.assistant-swatch {
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 0.08);
  transition: filter 0.12s ease;
}

/* 悬浮暗 2%，按下暗 6% */
.assistant-swatch:hover {
  filter: brightness(0.98);
}

.assistant-swatch:active {
  filter: brightness(0.94);
}

/* 当前展开的色块：加一圈内描边，避免与 hover/按下状态混淆 */
.assistant-swatch--active {
  box-shadow:
    inset 0 0 0 1px rgb(15 23 42 / 0.08),
    inset 0 0 0 3px rgb(15 23 42 / 0.3);
}

.assistant-swatch:focus-visible {
  outline: 2px solid #64748b;
  outline-offset: 2px;
}

/* Teleport 出去的弹层：宽度固定上限，窄屏时收窄到视口内 */
.assistant-popover {
  width: min(340px, calc(100vw - 16px));
  box-shadow:
    0 12px 28px -10px rgb(15 23 42 / 0.32),
    0 4px 10px -4px rgb(15 23 42 / 0.18);
  will-change: opacity, transform;
}

/* 行间 1px 分割线（gray-200） */
.assistant-row + .assistant-row {
  border-top: 1px solid #e5e7eb;
}

/* 8 种格式与「保存到调色板」之间的分割线（同 gray-200，样式对齐 ColorCard 的更多菜单） */
.assistant-divider {
  height: 1px;
  margin: 4px 8px;
  background-color: #e5e7eb;
}

/* 「保存到调色板」操作行 */
.assistant-save {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 4px;
  background-color: transparent;
  color: #334155;
  font: inherit;
  font-size: 11px;
  line-height: 16px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.assistant-save:hover {
  background-color: var(--color-slate-200);
}

.assistant-save:active {
  background-color: var(--color-gray-200);
}

.assistant-save:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 1px;
}

.assistant-save__icon {
  width: 12px;
  height: 12px;
  flex: none;
}

.assistant-pop-enter-active,
.assistant-pop-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.assistant-pop-enter-from,
.assistant-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .assistant-pop-enter-active,
  .assistant-pop-leave-active,
  .assistant-swatch {
    transition-duration: 0.001ms;
  }
}
</style>
