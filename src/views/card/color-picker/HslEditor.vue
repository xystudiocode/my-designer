<script setup lang="ts">
/**
 * HSL 选择器（任务书第 6 节）。
 *
 * 左侧 2D 面板：x = 饱和度 S(0-100)，y = 亮度 L(100→0)。
 * 颜色用 <canvas> 逐像素绘制，公式与 hslToRgb(h, x*100, (1-y)*100) 完全一致，
 * 不用 CSS 近似渐变。为让拖动 H 时也能流畅重绘，把与 S/L 无关的色相系数提前算好，
 * 内层循环只做与 hslToRgb 相同的乘加与四舍五入（结果逐像素完全相同）。
 *
 * 右侧竖向 H 滑块：CSS 7 段彩虹（hsl 0/60/…/360，S=100、L=50），
 * 与面板的 S/L 无关，始终鲜艳。
 *
 * 拖拽期间以指针位置为准（localHsl 覆盖由 props 派生的 h/s/l），
 * 避免 emit → props 回写造成的四舍五入抖动；props 被外部改动时再交还控制权。
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useI18n } from '@/i18n'
import { clamp, hslToRgb, normalizeRgb, rgbToHsl, type HslColor, type RgbColor } from './color'

const props = defineProps<{
  rgb: RgbColor
  alpha: number
}>()

const emit = defineEmits<{
  'update:rgb': [rgb: RgbColor]
  'update:alpha': [alpha: number]
}>()

const { t } = useI18n()

const panelEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const hueEl = ref<HTMLDivElement | null>(null)

/** 正在拖拽的区域；拖拽期间由 localHsl 接管显示，避免 props 回写造成抖动 */
const dragging = ref<'panel' | 'hue' | null>(null)
const localHsl = ref<HslColor | null>(null)

/** 最近一次自己 emit 的 rgb：props 回写时据此区分「外部改动」与「自己改动」 */
let lastEmittedRgb: RgbColor | null = null

/** 当前显示用的 h/s/l：拖拽时为指针位置，否则由 props.rgb 经 rgbToHsl 派生 */
const hsl = computed<HslColor>(() => localHsl.value ?? rgbToHsl(normalizeRgb(props.rgb)))

// 拇指半径（面板 16px 圆环 / 色相 20px 圆），用 clamp 把拇指夹在轨道内，避免贴边时溢出
const PANEL_THUMB_RADIUS = 8
const HUE_THUMB_RADIUS = 10

const panelThumbStyle = computed<CSSProperties>(() => ({
  left: `clamp(${PANEL_THUMB_RADIUS}px, ${hsl.value.s}%, calc(100% - ${PANEL_THUMB_RADIUS}px))`,
  top: `clamp(${PANEL_THUMB_RADIUS}px, ${100 - hsl.value.l}%, calc(100% - ${PANEL_THUMB_RADIUS}px))`,
}))

const hueThumbStyle = computed<CSSProperties>(() => ({
  top: `clamp(${HUE_THUMB_RADIUS}px, ${(hsl.value.h / 360) * 100}%, calc(100% - ${HUE_THUMB_RADIUS}px))`,
}))

const hueValue = computed(() => Math.round(hsl.value.h))

/** 不透明度滑块的值与轨道渐变（与 RGB 的不透明度滑块一致：同色渐变叠棋盘格） */
const alphaValue = computed(() => Math.round(clamp(props.alpha, 0, 100)))

const alphaTrackStyle = computed<CSSProperties>(() => {
  const { r, g, b } = normalizeRgb(props.rgb)
  return {
    backgroundImage:
      `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0), rgb(${r}, ${g}, ${b})), ` +
      'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%)',
    backgroundSize: 'auto, 16px 16px',
  }
})

/** HSL 手动输入框：H(0-360)、S / L / 不透明度(0-100) */
const MANUAL_FIELDS = [
  { key: 'h', labelKey: 'colorPicker.hue', max: 360 },
  { key: 's', labelKey: 'colorPicker.saturation', max: 100 },
  { key: 'l', labelKey: 'colorPicker.lightness', max: 100 },
  { key: 'a', labelKey: 'colorPicker.alpha', max: 100 },
] as const

type ManualKey = (typeof MANUAL_FIELDS)[number]['key']

const focusedField = reactive<Record<ManualKey, boolean>>({
  h: false,
  s: false,
  l: false,
  a: false,
})
const drafts = reactive<Record<ManualKey, string>>({ h: '0', s: '0', l: '0', a: '100' })

function fieldValue(key: ManualKey): number {
  if (key === 'a') return alphaValue.value
  const value = key === 'h' ? hsl.value.h : key === 's' ? hsl.value.s : hsl.value.l
  return Math.round(value)
}

/** 外部颜色 / 不透明度变化时同步未聚焦的输入框 */
function syncDrafts() {
  for (const field of MANUAL_FIELDS) {
    if (!focusedField[field.key]) drafts[field.key] = String(fieldValue(field.key))
  }
}

watch(() => [hsl.value.h, hsl.value.s, hsl.value.l, props.alpha], syncDrafts, { immediate: true })

/** 写入手动输入值：H 归一化到 0-359，其余夹紧 */
function setField(key: ManualKey, value: number) {
  if (!Number.isFinite(value)) return

  if (key === 'a') {
    const next = Math.round(clamp(value, 0, 100))
    if (next !== alphaValue.value) emit('update:alpha', next)
    return
  }

  const base = hsl.value
  const next: HslColor = {
    h: key === 'h' ? ((Math.round(value) % 360) + 360) % 360 : base.h,
    s: key === 's' ? clamp(value, 0, 100) : base.s,
    l: key === 'l' ? clamp(value, 0, 100) : base.l,
  }
  localHsl.value = next
  emitHsl(next)
}

function onManualInput(key: ManualKey, event: Event) {
  const text = (event.target as HTMLInputElement).value
  drafts[key] = text

  const value = Number(text)
  const max = MANUAL_FIELDS.find((field) => field.key === key)?.max ?? 100
  if (text.trim() === '' || !Number.isInteger(value) || value < 0 || value > max) return
  setField(key, value)
}

/** 提交输入框：空值 / 非法值回退，越界夹紧，小数取整 */
function commitDraft(key: ManualKey) {
  const text = drafts[key].trim()
  const max = MANUAL_FIELDS.find((field) => field.key === key)?.max ?? 100
  const parsed = Number(text)
  const next =
    text === '' || !Number.isFinite(parsed) ? fieldValue(key) : Math.round(clamp(parsed, 0, max))

  if (key === 'h') {
    drafts[key] = String(next % 360)
  } else {
    drafts[key] = String(next)
  }
  setField(key, next)
}

function onManualFocus(key: ManualKey, event: FocusEvent) {
  focusedField[key] = true
  ;(event.target as HTMLInputElement).select()
}

function onManualBlur(key: ManualKey) {
  focusedField[key] = false
  commitDraft(key)
}

function onManualKeydown(key: ManualKey, event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitDraft(key)
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    drafts[key] = String(fieldValue(key))
  }
}

function onAlphaInput(event: Event) {
  const next = Math.round(clamp(Number((event.target as HTMLInputElement).value), 0, 100))
  if (next !== alphaValue.value) emit('update:alpha', next)
}

/** 写回颜色：与当前 props 相同则不 emit */
function emitHsl(next: HslColor) {
  const rgb = hslToRgb(next)
  const current = normalizeRgb(props.rgb)
  if (rgb.r === current.r && rgb.g === current.g && rgb.b === current.b) return
  lastEmittedRgb = rgb
  emit('update:rgb', rgb)
}

function capturePointer(el: HTMLElement, event: PointerEvent) {
  try {
    el.setPointerCapture(event.pointerId)
  } catch {
    // 合成事件 / 部分环境下没有活动指针，忽略即可
  }
}

function releasePointer(el: HTMLElement, event: PointerEvent) {
  try {
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId)
  } catch {
    // 指针已被浏览器释放时忽略
  }
}

/** 指针 → 面板坐标：x 为饱和度，y 反向为亮度 */
function panelPoint(event: PointerEvent): { s: number; l: number } | null {
  const el = panelEl.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  return {
    s: clamp((event.clientX - rect.left) / rect.width, 0, 1) * 100,
    l: (1 - clamp((event.clientY - rect.top) / rect.height, 0, 1)) * 100,
  }
}

/** 面板拖拽时固定当前色相 H，只用指针位置更新 S / L */
function applyPanelPointer(event: PointerEvent) {
  const point = panelPoint(event)
  if (!point) return
  const next: HslColor = { h: hsl.value.h, s: point.s, l: point.l }
  localHsl.value = next
  emitHsl(next)
}

function onPanelPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const el = panelEl.value
  if (!el) return
  event.preventDefault()
  el.focus({ preventScroll: true })
  capturePointer(el, event)
  dragging.value = 'panel'
  localHsl.value = { ...hsl.value }
  applyPanelPointer(event)
}

function onPanelPointerMove(event: PointerEvent) {
  if (dragging.value !== 'panel') return
  applyPanelPointer(event)
}

function onPanelPointerUp(event: PointerEvent) {
  if (dragging.value !== 'panel') return
  dragging.value = null
  if (panelEl.value) releasePointer(panelEl.value, event)
}

/** 指针 → 色相：y 轴从上到下对应 0→360 */
function hueRatio(event: PointerEvent): number | null {
  const el = hueEl.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.height <= 0) return null
  return clamp((event.clientY - rect.top) / rect.height, 0, 1)
}

function applyHueRatio(ratio: number) {
  // 上限留一点余量：360 与 0 同色，避免松手后拇指从底部跳回顶部
  const next: HslColor = { h: Math.min(ratio * 360, 359.9), s: hsl.value.s, l: hsl.value.l }
  localHsl.value = next
  emitHsl(next)
}

function onHuePointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const el = hueEl.value
  if (!el) return
  event.preventDefault()
  el.focus({ preventScroll: true })
  capturePointer(el, event)
  dragging.value = 'hue'
  localHsl.value = { ...hsl.value }
  const ratio = hueRatio(event)
  if (ratio !== null) applyHueRatio(ratio)
}

function onHuePointerMove(event: PointerEvent) {
  if (dragging.value !== 'hue') return
  const ratio = hueRatio(event)
  if (ratio !== null) applyHueRatio(ratio)
}

function onHuePointerUp(event: PointerEvent) {
  if (dragging.value !== 'hue') return
  dragging.value = null
  if (hueEl.value) releasePointer(hueEl.value, event)
}

function onHueKeydown(event: KeyboardEvent) {
  const base = hsl.value
  const step = event.shiftKey ? 10 : 1
  let hue = base.h
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowRight':
      hue += step
      break
    case 'ArrowDown':
    case 'ArrowLeft':
      hue -= step
      break
    case 'Home':
      hue = 0
      break
    case 'End':
      // 360° 与 0° 同色；停在 359.9° 避免拇指从底部跳回顶部
      hue = 359.9
      break
    default:
      return
  }
  event.preventDefault()
  const next: HslColor = { h: ((hue % 360) + 360) % 360, s: base.s, l: base.l }
  // 保留本地值，避免 props 四舍五入回写导致拇指跳动
  localHsl.value = next
  emitHsl(next)
}

function onPanelKeydown(event: KeyboardEvent) {
  const base = hsl.value
  const step = event.shiftKey ? 10 : 1
  let s = base.s
  let l = base.l
  switch (event.key) {
    case 'ArrowLeft':
      s -= step
      break
    case 'ArrowRight':
      s += step
      break
    case 'ArrowUp':
      l += step
      break
    case 'ArrowDown':
      l -= step
      break
    default:
      return
  }
  event.preventDefault()
  const next: HslColor = { h: base.h, s: clamp(s, 0, 100), l: clamp(l, 0, 100) }
  localHsl.value = null
  emitHsl(next)
}

let frameId = 0
let resizeObserver: ResizeObserver | null = null

function scheduleDraw() {
  if (frameId !== 0) return
  frameId = requestAnimationFrame(() => {
    frameId = 0
    drawPanel()
  })
}

function drawPanel() {
  const canvas = canvasEl.value
  const host = panelEl.value
  if (!canvas || !host) return

  const cssWidth = host.clientWidth
  const cssHeight = host.clientHeight
  if (cssWidth <= 0 || cssHeight <= 0) return

  // 按 devicePixelRatio 放大 backing store，保证高分屏下每个物理像素都精确
  const dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1
  const width = Math.max(1, Math.round(cssWidth * dpr))
  const height = Math.max(1, Math.round(cssHeight * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) return

  const image = context.createImageData(width, height)
  const data = image.data
  const hue = ((hsl.value.h % 360) + 360) % 360
  const hueSegment = 1 - Math.abs(((hue / 60) % 2) - 1)

  // 与 hslToRgb 相同的分支：每个通道是 c、x=c*比值 或 0
  let redCoefficient = 0
  let greenCoefficient = 0
  let blueCoefficient = 0
  if (hue < 60) {
    redCoefficient = 1
    greenCoefficient = hueSegment
  } else if (hue < 120) {
    redCoefficient = hueSegment
    greenCoefficient = 1
  } else if (hue < 180) {
    greenCoefficient = 1
    blueCoefficient = hueSegment
  } else if (hue < 240) {
    greenCoefficient = hueSegment
    blueCoefficient = 1
  } else if (hue < 300) {
    redCoefficient = hueSegment
    blueCoefficient = 1
  } else {
    redCoefficient = 1
    blueCoefficient = hueSegment
  }

  const invWidth = 1 / width
  const invHeight = 1 / height
  for (let y = 0; y < height; y += 1) {
    // 像素中心对应的亮度：上 100 → 下 0
    const lightness = 1 - (y + 0.5) * invHeight
    const chromaScale = 1 - Math.abs(2 * lightness - 1)
    const rowOffset = y * width * 4
    for (let x = 0; x < width; x += 1) {
      const saturation = (x + 0.5) * invWidth
      const chroma = chromaScale * saturation
      const offset = lightness - chroma / 2
      const index = rowOffset + x * 4
      data[index] = Math.round((chroma * redCoefficient + offset) * 255)
      data[index + 1] = Math.round((chroma * greenCoefficient + offset) * 255)
      data[index + 2] = Math.round((chroma * blueCoefficient + offset) * 255)
      data[index + 3] = 255
    }
  }

  context.putImageData(image, 0, 0)
}

onMounted(() => {
  if (panelEl.value) {
    resizeObserver = new ResizeObserver(scheduleDraw)
    resizeObserver.observe(panelEl.value)
  }
  scheduleDraw()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (frameId !== 0) cancelAnimationFrame(frameId)
  frameId = 0
})

// 色相变化才需要重绘面板（S / L 只影响拇指位置）
watch(
  () => hsl.value.h,
  () => scheduleDraw(),
)

// props 被外部改动时放弃本地拖拽值，重新以 props 为准；
// 自己 emit 引起的回写要保留 localHsl（否则 359.9° 经 rgb 四舍五入会变成 0°，拇指跳回顶部）
watch(
  () => [props.rgb.r, props.rgb.g, props.rgb.b],
  () => {
    const current = normalizeRgb(props.rgb)
    const isSelfEcho =
      lastEmittedRgb !== null &&
      current.r === lastEmittedRgb.r &&
      current.g === lastEmittedRgb.g &&
      current.b === lastEmittedRgb.b
    if (!dragging.value && !isSelfEcho) localHsl.value = null
  },
)
</script>

<template>
  <div class="flex w-full min-w-0 flex-col gap-3 select-none">
    <div class="flex w-full min-w-0 items-stretch gap-3">
      <!-- 2D 面板：x = S，y = L（上白下黑） -->
      <div
        ref="panelEl"
        class="panel relative aspect-[13/9] min-w-0 flex-1 cursor-crosshair touch-none rounded-lg"
        role="group"
        aria-label="S / L"
        tabindex="0"
        @pointerdown="onPanelPointerDown"
        @pointermove="onPanelPointerMove"
        @pointerup="onPanelPointerUp"
        @pointercancel="onPanelPointerUp"
        @lostpointercapture="onPanelPointerUp"
        @keydown="onPanelKeydown"
      >
        <canvas ref="canvasEl" class="block h-full w-full rounded-lg" aria-hidden="true" />
        <span class="panel-thumb" :style="panelThumbStyle" />
      </div>

      <!-- 竖向 H 滑块：高度与 2D 面板一致，7 段彩虹，始终鲜艳 -->
      <div
        ref="hueEl"
        class="hue relative w-6 shrink-0 cursor-pointer touch-none rounded-full"
        role="slider"
        aria-label="H"
        aria-orientation="vertical"
        aria-valuemin="0"
        aria-valuemax="360"
        :aria-valuenow="hueValue"
        tabindex="0"
        @pointerdown="onHuePointerDown"
        @pointermove="onHuePointerMove"
        @pointerup="onHuePointerUp"
        @pointercancel="onHuePointerUp"
        @lostpointercapture="onHuePointerUp"
        @keydown="onHueKeydown"
      >
        <div class="hue-track absolute inset-0 rounded-full" />
        <span class="hue-thumb" :style="hueThumbStyle" />
      </div>
    </div>

    <!-- 不透明度滑块：与 RGB 的不透明度滑块同样的实时渐变，无输入框 / 标签 -->
    <div class="relative h-6 w-full">
      <div
        class="alpha-track pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        :style="alphaTrackStyle"
      />
      <input
        class="alpha-range absolute inset-0 h-full w-full cursor-pointer"
        type="range"
        min="0"
        max="100"
        step="1"
        :value="alphaValue"
        :aria-label="t('colorPicker.alpha')"
        :aria-valuetext="String(alphaValue)"
        @input="onAlphaInput"
      />
    </div>

    <!-- HSL 手动输入：H(0-360)、S / L / 不透明度(0-100) -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label v-for="field in MANUAL_FIELDS" :key="field.key" class="flex items-center gap-2">
        <input
          class="number-input h-8 w-[68px] rounded-md border border-slate-300 bg-white px-1 text-center text-sm tabular-nums text-slate-700"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          spellcheck="false"
          maxlength="3"
          :value="drafts[field.key]"
          :aria-label="t(field.labelKey)"
          @input="onManualInput(field.key, $event)"
          @focus="onManualFocus(field.key, $event)"
          @blur="onManualBlur(field.key)"
          @keydown="onManualKeydown(field.key, $event)"
        />
        <span class="text-sm leading-5 text-slate-600">{{ t(field.labelKey) }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
/* 不透明度轨道：同色渐变叠 8px 棋盘格（同 RgbEditor） */
.alpha-track {
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 0.12);
}

/* 滑块本体透明，只保留可交互区域与白色圆形拇指 */
.alpha-range {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
  background: transparent;
}

.alpha-range:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
  border-radius: 9999px;
}

.alpha-range::-webkit-slider-runnable-track {
  height: 24px;
  border: 0;
  background: transparent;
}

.alpha-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  margin-top: 2px;
  border: 0;
  border-radius: 9999px;
  background-color: #fff;
  box-shadow:
    0 1px 3px rgb(15 23 42 / 0.3),
    0 1px 2px rgb(15 23 42 / 0.18);
  cursor: grab;
}

.alpha-range:active::-webkit-slider-thumb {
  cursor: grabbing;
}

.alpha-range::-moz-range-track {
  height: 24px;
  border: 0;
  background: transparent;
}

.alpha-range::-moz-range-progress {
  background: transparent;
}

.alpha-range::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 9999px;
  background-color: #fff;
  box-shadow:
    0 1px 3px rgb(15 23 42 / 0.3),
    0 1px 2px rgb(15 23 42 / 0.18);
  cursor: grab;
}

.alpha-range:active::-moz-range-thumb {
  cursor: grabbing;
}

.number-input {
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.number-input:focus {
  border-color: var(--color-accent-60);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-60) 30%, transparent);
}

.panel:focus-visible,
.hue:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
}

/* 面板拇指：白色圆环 + 深色描边，浅色区域也能看清 */
.panel-thumb {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-radius: 9999px;
  box-shadow:
    0 0 0 1px rgb(15 23 42 / 0.5),
    0 2px 6px rgb(15 23 42 / 0.35);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 色相轨道：hsl 0/60/…/360 在 S=100、L=50 下与 RGB 线性插值一致 */
.hue-track {
  background: linear-gradient(
    to bottom,
    hsl(0 100% 50%),
    hsl(60 100% 50%),
    hsl(120 100% 50%),
    hsl(180 100% 50%),
    hsl(240 100% 50%),
    hsl(300 100% 50%),
    hsl(360 100% 50%)
  );
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 0.12);
}

/* 色相拇指：白色圆形 + 阴影 */
.hue-thumb {
  position: absolute;
  left: 50%;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  background-color: #fff;
  box-shadow:
    0 1px 4px rgb(15 23 42 / 0.35),
    0 0 0 1px rgb(15 23 42 / 0.15);
  transform: translate(-50%, -50%);
  pointer-events: none;
}
</style>
