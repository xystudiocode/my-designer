<script setup lang="ts">
/**
 * 二维色板：canvas 逐像素绘制。
 *
 * - 横轴 / 纵轴由坐标轴设置决定（xKey / yKey），第三个分量取当前滑块值；
 * - 像素 → 模式空间值 → sample()：不可显示（仅 OKLCH）画白色 #ffffff；
 * - OKLCH：像素遍历时顺便判定 P3 / REC2020 色域，在相邻像素色域等级变化处
 *   画 1 CSS px 色域线，并在线条中部画跟随线方向的文字标签（白色描边 + 深色字）；
 * - 性能：按 devicePixelRatio 放大 backing store，像素循环里不创建对象 / 字符串，
 *   requestAnimationFrame 合并重绘，ResizeObserver 监听尺寸；
 * - 交互：指针拖拽 + 方向键（Shift ×10）/ Home / End，与旧 HslEditor 一致。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useI18n } from '@/i18n'
import { clamp, type ColorFormat } from './color'
import {
  channelDefinition,
  channelValueAtRatio,
  createPanelSampler,
  modeDefinition,
  type ModeChannelDef,
  type ModeValues,
  type PanelSample,
} from './modes'

const props = defineProps<{
  mode: ColorFormat
  values: ModeValues
  xKey: string
  yKey: string
}>()

const emit = defineEmits<{
  'update:values': [values: ModeValues]
}>()

const { t, locale } = useI18n()

const panelEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)

const definition = computed(() => modeDefinition(props.mode))
const xChannel = computed<ModeChannelDef>(
  () => channelDefinition(props.mode, props.xKey) ?? definition.value.channels[0]!,
)
const yChannel = computed<ModeChannelDef>(
  () => channelDefinition(props.mode, props.yKey) ?? definition.value.channels[1]!,
)

/** 百分比画面板拇指时夹在面板内（与 HslEditor 一致） */
const PANEL_THUMB_RADIUS = 8

/** 色域线颜色 / 标签 */
const GAMUT_P3_COLOR = 'rgba(15, 23, 42, 0.85)'
const GAMUT_REC2020_COLOR = 'rgba(71, 85, 105, 0.9)'

function channelValueOf(channel: ModeChannelDef): number {
  const raw = Number(props.values[channel.key])
  return Number.isFinite(raw) ? clamp(raw, channel.min, channel.max) : channel.min
}

const xRatio = computed(() => {
  const channel = xChannel.value
  return (channelValueOf(channel) - channel.min) / (channel.max - channel.min)
})

const yRatio = computed(() => {
  const channel = yChannel.value
  return 1 - (channelValueOf(channel) - channel.min) / (channel.max - channel.min)
})

const panelThumbStyle = computed<CSSProperties>(() => ({
  left: `clamp(${PANEL_THUMB_RADIUS}px, ${xRatio.value * 100}%, calc(100% - ${PANEL_THUMB_RADIUS}px))`,
  top: `clamp(${PANEL_THUMB_RADIUS}px, ${yRatio.value * 100}%, calc(100% - ${PANEL_THUMB_RADIUS}px))`,
}))

const panelAriaLabel = computed(
  () => `${t(xChannel.value.labelKey)} / ${t(yChannel.value.labelKey)}`,
)

/* ------------------------------------------------------------------------------------------
 * 指针 / 键盘交互
 * ---------------------------------------------------------------------------------------- */

const dragging = ref(false)

function capturePointer(el: HTMLElement, event: PointerEvent): void {
  try {
    el.setPointerCapture(event.pointerId)
  } catch {
    // 合成事件 / 部分环境下没有活动指针，忽略即可
  }
}

function releasePointer(el: HTMLElement, event: PointerEvent): void {
  try {
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId)
  } catch {
    // 指针已被浏览器释放时忽略
  }
}

function pointerRatios(event: PointerEvent): { x: number; y: number } | null {
  const el = panelEl.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
  }
}

/** 拖拽时只改横轴 / 纵轴分量，滑块分量保持当前值 */
function applyPointer(event: PointerEvent): void {
  const ratios = pointerRatios(event)
  if (!ratios) return
  const x = xChannel.value
  const y = yChannel.value
  emit('update:values', {
    ...props.values,
    [x.key]: channelValueAtRatio(x, ratios.x),
    [y.key]: channelValueAtRatio(y, 1 - ratios.y),
  })
}

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const el = panelEl.value
  if (!el) return
  event.preventDefault()
  el.focus({ preventScroll: true })
  capturePointer(el, event)
  dragging.value = true
  applyPointer(event)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return
  applyPointer(event)
}

function onPointerUp(event: PointerEvent): void {
  if (!dragging.value) return
  dragging.value = false
  if (panelEl.value) releasePointer(panelEl.value, event)
}

/** 把任意值收敛到分量范围（色相右端停在 359.9°） */
function clampedValue(channel: ModeChannelDef, value: number): number {
  return channelValueAtRatio(channel, (value - channel.min) / (channel.max - channel.min))
}

function onKeydown(event: KeyboardEvent): void {
  const x = xChannel.value
  const y = yChannel.value
  const multiplier = event.shiftKey ? 10 : 1
  let xValue = channelValueOf(x)
  let yValue = channelValueOf(y)

  switch (event.key) {
    case 'ArrowLeft':
      xValue -= (x.step ?? 1) * multiplier
      break
    case 'ArrowRight':
      xValue += (x.step ?? 1) * multiplier
      break
    case 'ArrowUp':
      yValue += (y.step ?? 1) * multiplier
      break
    case 'ArrowDown':
      yValue -= (y.step ?? 1) * multiplier
      break
    case 'Home':
      xValue = x.min
      break
    case 'End':
      xValue = x.max
      break
    default:
      return
  }

  event.preventDefault()
  emit('update:values', {
    ...props.values,
    [x.key]: clampedValue(x, xValue),
    [y.key]: clampedValue(y, yValue),
  })
}

/* ------------------------------------------------------------------------------------------
 * 绘制
 * ---------------------------------------------------------------------------------------- */

let frameId = 0
let resizeObserver: ResizeObserver | null = null

function scheduleDraw(): void {
  if (frameId !== 0) return
  frameId = requestAnimationFrame(() => {
    frameId = 0
    drawPanel()
  })
}

interface LabelAnchor {
  x: number
  y: number
  angle: number
}

/** 边界点集合：扁平数组 [x0, y0, x1, y1, ...]（device px） */
type BoundaryPoints = number[]

/**
 * 找「线中部」的标签锚点：
 * 取离边界点质心最近的点作为中部，再用局部点集的主方向估计线条方向。
 */
function findLabelAnchor(
  points: BoundaryPoints,
  width: number,
  height: number,
  dpr: number,
): LabelAnchor | null {
  const count = Math.floor(points.length / 2)
  if (count < 12) return null

  let sumX = 0
  let sumY = 0
  for (let index = 0; index < count; index += 1) {
    sumX += points[index * 2] ?? 0
    sumY += points[index * 2 + 1] ?? 0
  }
  const centerX = sumX / count
  const centerY = sumY / count

  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < count; index += 1) {
    const dx = (points[index * 2] ?? 0) - centerX
    const dy = (points[index * 2 + 1] ?? 0) - centerY
    const distance = dx * dx + dy * dy
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }
  return anchorAt(points, count, bestIndex, width, height, dpr)
}

/** 以某个边界点为中心估计文字方向，并把位置夹在画布内 */
function anchorAt(
  points: BoundaryPoints,
  count: number,
  index: number,
  width: number,
  height: number,
  dpr: number,
): LabelAnchor {
  const x = points[index * 2] ?? 0
  const y = points[index * 2 + 1] ?? 0
  const inner = 8 * dpr
  const outer = 48 * dpr

  let cxx = 0
  let cxy = 0
  let cyy = 0
  let found = 0
  for (let cursor = 0; cursor < count; cursor += 1) {
    const dx = (points[cursor * 2] ?? 0) - x
    const dy = (points[cursor * 2 + 1] ?? 0) - y
    const distance = Math.hypot(dx, dy)
    if (distance < inner || distance > outer) continue
    cxx += dx * dx
    cxy += dx * dy
    cyy += dy * dy
    found += 1
  }

  let angle = 0
  if (found >= 4) {
    cxx /= found
    cxy /= found
    cyy /= found
    // 主方向的夹角（PCA）
    angle = 0.5 * Math.atan2(2 * cxy, cxx - cyy)
  }
  // 文字保持朝上：把方向收敛到 (-90°, 90°]
  while (angle > Math.PI / 2) angle -= Math.PI
  while (angle <= -Math.PI / 2) angle += Math.PI

  const margin = 30 * dpr
  return {
    x: clamp(x, margin, Math.max(margin, width - margin)),
    y: clamp(y, margin, Math.max(margin, height - margin)),
    angle,
  }
}

/** 在边界点里挑一个离另一个标签最远的点（避免两条线的标签重叠） */
function findAnchorFarthestFrom(
  points: BoundaryPoints,
  other: LabelAnchor,
  width: number,
  height: number,
  dpr: number,
): LabelAnchor | null {
  const count = Math.floor(points.length / 2)
  if (count < 12) return null

  let bestIndex = 0
  let bestDistance = -1
  for (let index = 0; index < count; index += 1) {
    const dx = (points[index * 2] ?? 0) - other.x
    const dy = (points[index * 2 + 1] ?? 0) - other.y
    const distance = dx * dx + dy * dy
    if (distance > bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }
  return anchorAt(points, count, bestIndex, width, height, dpr)
}

function drawGamutLabel(
  context: CanvasRenderingContext2D,
  anchor: LabelAnchor,
  text: string,
  dpr: number,
): void {
  context.save()
  context.translate(anchor.x, anchor.y)
  context.rotate(anchor.angle)
  context.font = `600 ${12 * dpr}px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  // 白色描边 + 深色字：压在任意底色上都可读
  context.lineWidth = 4 * dpr
  context.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  context.strokeText(text, 0, 0)
  context.fillStyle = '#0f172a'
  context.fillText(text, 0, 0)
  context.restore()
}

function drawGamutLabels(
  context: CanvasRenderingContext2D,
  p3Points: BoundaryPoints,
  rec2020Points: BoundaryPoints,
  width: number,
  height: number,
  dpr: number,
): void {
  const p3Anchor = findLabelAnchor(p3Points, width, height, dpr)
  let rec2020Anchor = findLabelAnchor(rec2020Points, width, height, dpr)

  // 两条线在中部可能靠得很近：把 REC2020 的标签挪到离 P3 标签最远的边界点
  if (p3Anchor && rec2020Anchor) {
    const gap = Math.hypot(p3Anchor.x - rec2020Anchor.x, p3Anchor.y - rec2020Anchor.y)
    if (gap < 120 * dpr) {
      rec2020Anchor =
        findAnchorFarthestFrom(rec2020Points, p3Anchor, width, height, dpr) ?? rec2020Anchor
    }
  }

  if (p3Anchor) drawGamutLabel(context, p3Anchor, t('colorPicker.gamutP3'), dpr)
  if (rec2020Anchor) drawGamutLabel(context, rec2020Anchor, t('colorPicker.gamutRec2020'), dpr)
}

function drawPanel(): void {
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
  const x = xChannel.value
  const y = yChannel.value
  const sampler = createPanelSampler(props.mode, props.values, x.key, y.key)
  const gamutLines = definition.value.showGamutLines === true
  const levels = gamutLines ? new Uint8Array(width * height) : null
  const p3Path = gamutLines ? new Path2D() : null
  const rec2020Path = gamutLines ? new Path2D() : null
  const p3Points: BoundaryPoints = []
  const rec2020Points: BoundaryPoints = []
  const sample: PanelSample = { rgb: -1, inSrgb: true, inP3: true, inRec2020: true }

  const invWidth = 1 / width
  const invHeight = 1 / height
  for (let row = 0; row < height; row += 1) {
    const yRatio = (row + 0.5) * invHeight
    const rowOffset = row * width
    for (let col = 0; col < width; col += 1) {
      sampler((col + 0.5) * invWidth, yRatio, sample)

      const index = (rowOffset + col) * 4
      if (sample.rgb < 0) {
        // 不可显示：画白色（Tailwind white）
        data[index] = 255
        data[index + 1] = 255
        data[index + 2] = 255
      } else {
        data[index] = (sample.rgb >> 16) & 0xff
        data[index + 1] = (sample.rgb >> 8) & 0xff
        data[index + 2] = sample.rgb & 0xff
      }
      data[index + 3] = 255

      if (!levels || !p3Path || !rec2020Path) continue

      // 色域等级：0 = sRGB 内、1 = 仅 P3 内、2 = 仅 REC2020 内、3 = 都超出
      const level = sample.rgb >= 0 ? 0 : sample.inP3 ? 1 : sample.inRec2020 ? 2 : 3
      levels[rowOffset + col] = level
      const p3Inside = level <= 1
      const rec2020Inside = level <= 2

      if (col > 0) {
        const left = levels[rowOffset + col - 1] ?? 0
        if (left <= 1 !== p3Inside) {
          // 竖向边界：1 CSS px 宽的线段
          p3Path.moveTo(col, row)
          p3Path.lineTo(col, row + 1)
          p3Points.push(col, row)
        }
        if (left <= 2 !== rec2020Inside) {
          rec2020Path.moveTo(col, row)
          rec2020Path.lineTo(col, row + 1)
          rec2020Points.push(col, row)
        }
      }
      if (row > 0) {
        const top = levels[rowOffset + col - width] ?? 0
        if (top <= 1 !== p3Inside) {
          p3Path.moveTo(col, row)
          p3Path.lineTo(col + 1, row)
          p3Points.push(col, row)
        }
        if (top <= 2 !== rec2020Inside) {
          rec2020Path.moveTo(col, row)
          rec2020Path.lineTo(col + 1, row)
          rec2020Points.push(col, row)
        }
      }
    }
  }

  context.putImageData(image, 0, 0)

  if (levels && p3Path && rec2020Path) {
    context.save()
    context.lineWidth = Math.max(1, dpr)
    context.lineCap = 'round'
    context.strokeStyle = GAMUT_P3_COLOR
    context.stroke(p3Path)
    context.strokeStyle = GAMUT_REC2020_COLOR
    context.stroke(rec2020Path)
    context.restore()

    drawGamutLabels(context, p3Points, rec2020Points, width, height, dpr)
  }
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

// 坐标轴 / 模式 / 当前分量变化都需要重绘
watch(
  () => [props.mode, props.xKey, props.yKey, props.values],
  () => scheduleDraw(),
  { deep: true },
)

// 切换语言时滤镜标签文字也要重绘
watch(locale, () => scheduleDraw())
</script>

<template>
  <div
    ref="panelEl"
    class="panel relative w-full min-w-0 cursor-crosshair touch-none select-none overflow-hidden rounded-lg"
    role="group"
    :aria-label="panelAriaLabel"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @lostpointercapture="onPointerUp"
    @keydown="onKeydown"
  >
    <canvas ref="canvasEl" class="block h-full w-full rounded-lg" aria-hidden="true" />
    <span class="panel-thumb" :style="panelThumbStyle" />
  </div>
</template>

<style scoped>
/*
 * 二维色板尺寸：宽度撑满容器，高度限幅（宽屏 clamp(240px, 42vh, 400px)），
 * 避免在大屏上把页面撑得过长、挤掉手动输入与坐标轴；窄屏再矮一点。
 */
.panel {
  height: clamp(240px, 42vh, 400px);
}

@media (max-width: 1100px) {
  .panel {
    height: 260px;
  }
}

.panel:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
}

/* 面板拇指：白色圆环 + 深色描边，浅色 / 深色区域都能看清 */
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
</style>
