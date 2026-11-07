<script setup lang="ts">
/**
 * 二维图右侧的竖向滑块（回滚为原 HSL 设计的竖向色相滑块）。
 *
 * - 轨道是 24px 宽的胶囊，渐变从顶部（分量最小值）到底部（最大值），由 `sliderTracks.ts`
 *   的 `channelTrackColors()` 计算；OKLCH 额外画可显示 ↔ 不可显示边界的横向虚线。
 * - 拖动 / 键盘 ↑↓（Shift ×10）/ Home / End 修改当前滑块分量，其它分量保持不变。
 */
import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'
import { useI18n } from '@/i18n'
import type { ColorFormat } from './color'
import { channelDefinition, formatChannelValue, isHueChannel, type ModeValues } from './modes'
import { channelTrackColors, channelTrackMarkers, type TrackMarker } from './sliderTracks'

const props = defineProps<{
  mode: ColorFormat
  values: ModeValues
  sliderKey: string
}>()

const emit = defineEmits<{
  'update:values': [values: ModeValues]
}>()

const { t } = useI18n()

/** 拇指半径（px）：用于把拇指夹在轨道内 */
const THUMB_RADIUS = 10

const trackEl = ref<HTMLDivElement | null>(null)

const channel = computed(() => channelDefinition(props.mode, props.sliderKey))

/** 当前值（夹紧到分量范围） */
const currentValue = computed(() => {
  const def = channel.value
  if (!def) return 0
  const raw = Number(props.values[def.key])
  return Number.isFinite(raw) ? Math.min(def.max, Math.max(def.min, raw)) : def.min
})

/** 值在轨道上的比例：顶部 = 最小值，底部 = 最大值 */
const valueRatio = computed(() => {
  const def = channel.value
  if (!def || def.max <= def.min) return 0
  return (currentValue.value - def.min) / (def.max - def.min)
})

const thumbStyle = computed<CSSProperties>(() => ({
  top: `clamp(${THUMB_RADIUS}px, ${valueRatio.value * 100}%, calc(100% - ${THUMB_RADIUS}px))`,
}))

const trackStyle = computed<CSSProperties>(() => {
  const def = channel.value
  if (!def) return {}
  const colors = channelTrackColors(props.mode, props.values, def.key)
  return { backgroundImage: `linear-gradient(to bottom, ${colors.join(', ')})` }
})

const markers = computed<TrackMarker[]>(() => {
  const def = channel.value
  if (!def) return []
  return channelTrackMarkers(props.mode, props.values, def.key)
})

const ariaValueText = computed(() => {
  const def = channel.value
  return def ? formatChannelValue(def, currentValue.value) : ''
})

/** 把一个原始值量化成该分量的合法值（色相取整并停在 359.9°） */
function quantize(raw: number): number {
  const def = channel.value
  if (!def) return 0
  let next = Math.min(def.max, Math.max(def.min, raw))
  if (isHueChannel(def)) {
    next = Math.min(Math.round(next), 359.9)
  } else if ((def.digits ?? 0) > 0) {
    const factor = 10 ** (def.digits ?? 0)
    next = Math.round(next * factor) / factor
  } else {
    next = Math.round(next)
  }
  return next
}

/** 写入分量值：与当前值相同时不 emit */
function applyValue(raw: number): void {
  const def = channel.value
  if (!def) return
  const next = quantize(raw)
  if (next === currentValue.value) return
  emit('update:values', { ...props.values, [def.key]: next })
}

/** 指针位置（比例 0-1，顶部为 0）→ 分量值 */
function ratioFromPointer(event: PointerEvent): number | null {
  const el = trackEl.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.height <= 0) return null
  return Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
}

function applyRatio(ratio: number): void {
  const def = channel.value
  if (!def) return
  applyValue(def.min + (def.max - def.min) * ratio)
}

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

const dragging = ref(false)

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const el = trackEl.value
  if (!el) return
  event.preventDefault()
  el.focus({ preventScroll: true })
  capturePointer(el, event)
  dragging.value = true
  const ratio = ratioFromPointer(event)
  if (ratio !== null) applyRatio(ratio)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return
  const ratio = ratioFromPointer(event)
  if (ratio !== null) applyRatio(ratio)
}

function onPointerUp(event: PointerEvent): void {
  if (!dragging.value) return
  dragging.value = false
  if (trackEl.value) releasePointer(trackEl.value, event)
}

function onKeydown(event: KeyboardEvent): void {
  const def = channel.value
  if (!def) return
  const step = (def.step ?? 1) * (event.shiftKey ? 10 : 1)
  let next = currentValue.value
  switch (event.key) {
    case 'ArrowUp':
      next -= step
      break
    case 'ArrowDown':
      next += step
      break
    case 'Home':
      next = def.min
      break
    case 'End':
      next = def.max
      break
    default:
      return
  }
  event.preventDefault()
  applyValue(next)
}
</script>

<template>
  <div
    ref="trackEl"
    class="vertical-slider relative w-6 shrink-0 cursor-pointer touch-none rounded-full"
    role="slider"
    :aria-label="channel ? t(channel.labelKey) : t('colorPicker.sliders')"
    aria-orientation="vertical"
    :aria-valuemin="channel?.min ?? 0"
    :aria-valuemax="channel?.max ?? 100"
    :aria-valuenow="currentValue"
    :aria-valuetext="ariaValueText"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @lostpointercapture="onPointerUp"
    @keydown="onKeydown"
  >
    <div class="vertical-slider__track absolute inset-0 rounded-full" :style="trackStyle" />
    <span
      v-for="marker in markers"
      :key="marker.key"
      class="vertical-marker"
      :class="{ 'vertical-marker--dashed': marker.dashed }"
      :style="{ top: `${marker.position}%` }"
      aria-hidden="true"
    ></span>
    <span class="vertical-slider__thumb" :style="thumbStyle" />
  </div>
</template>

<style scoped>
/* 内描边：浅色渐变在白色背景上也能看清轨道边界 */
.vertical-slider__track {
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 0.12);
}

.vertical-slider:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
}

/* 分隔线（横向）：实线细刻度 / 虚线色域边界 */
.vertical-marker {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 1;
  height: 1px;
  transform: translateY(-50%);
  background-color: rgb(15 23 42 / 0.28);
  pointer-events: none;
}

.vertical-marker--dashed {
  background-color: transparent;
  background-image: repeating-linear-gradient(
    to right,
    rgb(15 23 42 / 0.7) 0 3px,
    transparent 3px 6px
  );
}

/* 拇指：白色圆形 + 阴影（居中在轨道上） */
.vertical-slider__thumb {
  position: absolute;
  left: 50%;
  z-index: 2;
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
