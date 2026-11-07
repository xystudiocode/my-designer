<script setup lang="ts">
/**
 * 多滑块区域的横向滑块。
 *
 * - 所有模式都渲染全部分量行（RGB / CMYK = 分量行 + 不透明度行；二维图模式同样是全部分量 + 不透明度）
 * - 每行 = 胶囊轨道（渐变 + 分隔线）+ 数字输入框 + 标签；最后一行固定为不透明度
 * - 轨道渐变 / 分隔线由 `sliderTracks.ts` 的纯函数计算，与二维图右侧的竖向滑块共用同一套逻辑
 *
 * 数字输入框沿用 RGB 滑块的交互：输入中允许临时空值 / 越界，失焦 / 回车夹紧。
 */
import { computed, reactive, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useI18n } from '@/i18n'
import { clamp, type ColorFormat, type RgbColor } from './color'
import {
  formatChannelValue,
  isHueChannel,
  modeDefinition,
  type ModeChannelDef,
  type ModeValues,
} from './modes'
import {
  alphaTrackBackground,
  channelTrackColors,
  channelTrackMarkers,
  type TrackMarker,
} from './sliderTracks'

const props = defineProps<{
  mode: ColorFormat
  values: ModeValues
  alpha: number
}>()

const emit = defineEmits<{
  'update:values': [values: ModeValues]
  'update:alpha': [alpha: number]
}>()

const { t } = useI18n()

/** 不透明度行的 key（与模式分量区分） */
const ALPHA_KEY = 'alpha'

interface SliderRow {
  key: string
  label: string
  channel: ModeChannelDef | null
  /** 是否是不透明度行（panel-first 模式下数字输入统一由 ManualInputs 提供） */
  isAlpha: boolean
  min: number
  max: number
  step: number
  digits: number
  value: number
  trackStyle: CSSProperties
  markers: TrackMarker[]
}

const definition = computed(() => modeDefinition(props.mode))
const isSlidersFirst = computed(() => definition.value.layout === 'sliders-first')

/** 当前要渲染的行：全部分量行 + 不透明度行 */
const rows = computed<SliderRow[]>(() => {
  const def = definition.value
  const list: SliderRow[] = []

  for (const channel of def.channels) {
    const raw = Number(props.values[channel.key])
    const value = Number.isFinite(raw) ? clamp(raw, channel.min, channel.max) : channel.min
    list.push({
      key: channel.key,
      label: t(channel.labelKey),
      channel,
      isAlpha: false,
      min: channel.min,
      max: channel.max,
      step: channel.step ?? 1,
      digits: channel.digits ?? 0,
      value,
      trackStyle: {
        backgroundImage: `linear-gradient(to right, ${channelTrackColors(props.mode, props.values, channel.key).join(', ')})`,
      },
      markers: channelTrackMarkers(props.mode, props.values, channel.key),
    })
  }

  const displayRgb: RgbColor = def.toRgb(props.values)
  list.push({
    key: ALPHA_KEY,
    label: t('colorPicker.alpha'),
    channel: null,
    isAlpha: true,
    min: 0,
    max: 100,
    step: 1,
    digits: 0,
    value: Math.round(clamp(props.alpha, 0, 100)),
    trackStyle: alphaTrackBackground(displayRgb),
    markers: [],
  })
  return list
})

/* ------------------------------------------------------------------------------------------
 * 输入框草稿与提交
 * ---------------------------------------------------------------------------------------- */

const drafts = reactive<Record<string, string>>({})
const focused = reactive<Record<string, boolean>>({})

function formatRow(row: SliderRow, value: number): string {
  if (row.channel) return formatChannelValue(row.channel, value)
  return String(Math.round(clamp(value, 0, 100)))
}

function syncDrafts(): void {
  for (const row of rows.value) {
    if (!focused[row.key]) drafts[row.key] = formatRow(row, row.value)
  }
}

watch(() => [props.mode, props.values, props.alpha], syncDrafts, { immediate: true, deep: true })

/** 写入一个值：返回实际生效的数值（用于回填输入框） */
function applyValue(row: SliderRow, raw: number): number {
  if (!Number.isFinite(raw)) return row.value

  if (!row.channel) {
    const next = Math.round(clamp(raw, 0, 100))
    if (next !== Math.round(clamp(props.alpha, 0, 100))) emit('update:alpha', next)
    return next
  }

  const channel = row.channel
  let next = clamp(raw, channel.min, channel.max)
  if (isHueChannel(channel)) {
    // 色相按度数取整；360° 与 0° 同色，停在 359.9° 避免拇指跳回左端
    next = Math.min(Math.round(next), 359.9)
  } else if (row.digits > 0) {
    const factor = 10 ** row.digits
    next = Math.round(next * factor) / factor
  } else {
    next = Math.round(next)
  }

  emit('update:values', { ...props.values, [channel.key]: next })
  return next
}

function onRangeInput(row: SliderRow, event: Event): void {
  const raw = Number((event.target as HTMLInputElement).value)
  const next = applyValue(row, raw)
  drafts[row.key] = formatRow(row, next)
}

function onNumberInput(row: SliderRow, event: Event): void {
  const text = (event.target as HTMLInputElement).value
  drafts[row.key] = text
  if (text.trim() === '') return

  const parsed = Number(text)
  if (!Number.isFinite(parsed)) return
  // 编辑中只有范围合法的值才实时同步；越界留到失焦 / 回车时夹紧
  if (parsed < row.min || parsed > row.max) return
  applyValue(row, parsed)
}

function commitDraft(row: SliderRow): void {
  const text = (drafts[row.key] ?? '').trim()
  const parsed = Number(text)
  if (text === '' || !Number.isFinite(parsed)) {
    drafts[row.key] = formatRow(row, row.value)
    return
  }
  const next = applyValue(row, parsed)
  drafts[row.key] = formatRow(row, next)
}

function onNumberFocus(row: SliderRow, event: FocusEvent): void {
  focused[row.key] = true
  ;(event.target as HTMLInputElement).select()
}

function onNumberBlur(row: SliderRow): void {
  focused[row.key] = false
  commitDraft(row)
}

function onNumberKeydown(row: SliderRow, event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitDraft(row)
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    drafts[row.key] = formatRow(row, row.value)
    return
  }
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
    const direction = event.key === 'ArrowUp' ? 1 : -1
    const step = row.step * (event.shiftKey ? 10 : 1)
    const next = applyValue(row, row.value + direction * step)
    drafts[row.key] = formatRow(row, next)
  }
}
</script>

<template>
  <div class="channel-sliders flex flex-col gap-3">
    <div v-for="row in rows" :key="row.key" class="flex items-center gap-3">
      <!-- 胶囊轨道：渐变 / 分隔线画在这一层，range 本体透明，只露出白色拇指 -->
      <div class="slider-track relative h-6 min-w-0 flex-1">
        <div
          class="slider-track__gradient pointer-events-none absolute inset-0 overflow-hidden rounded-full"
          :style="row.trackStyle"
        />
        <span
          v-for="marker in row.markers"
          :key="marker.key"
          class="slider-marker"
          :class="{ 'slider-marker--dashed': marker.dashed }"
          :style="{ left: `${marker.position}%` }"
          aria-hidden="true"
        ></span>
        <input
          class="color-range absolute inset-0 h-full w-full cursor-pointer"
          type="range"
          :min="row.min"
          :max="row.max"
          :step="row.step"
          :value="row.value"
          :aria-label="row.label"
          :aria-valuetext="formatRow(row, row.value)"
          @input="onRangeInput(row, $event)"
        />
      </div>

      <!--
        分量行：胶囊轨道 + 数字输入框 + 标签；
        不透明度行在 panel-first 模式下没有数字输入框（数字输入统一由 ManualInputs 提供），
        sliders-first 模式没有 ManualInputs，所以不透明度行也带数字输入框。
      -->
      <template v-if="!row.isAlpha || isSlidersFirst">
        <input
          class="number-input h-8 w-[68px] shrink-0 rounded-md border border-slate-300 bg-white px-1 text-center text-sm tabular-nums text-slate-700"
          type="text"
          :inputmode="row.digits > 0 || row.min < 0 ? 'decimal' : 'numeric'"
          autocomplete="off"
          spellcheck="false"
          maxlength="8"
          :value="drafts[row.key] ?? formatRow(row, row.value)"
          :aria-label="row.label"
          @input="onNumberInput(row, $event)"
          @focus="onNumberFocus(row, $event)"
          @blur="onNumberBlur(row)"
          @keydown="onNumberKeydown(row, $event)"
        />
      </template>

      <span class="shrink-0 whitespace-nowrap text-sm leading-5 text-slate-600">
        {{ row.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* 内描边：浅色渐变 / 棋盘格在白色背景上也能看清轨道边界 */
.slider-track__gradient {
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 0.12);
}

/* 分隔线：实线细刻度 / 虚线色域边界，不参与交互 */
.slider-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  width: 1px;
  transform: translateX(-50%);
  background-color: rgb(15 23 42 / 0.28);
  pointer-events: none;
}

.slider-marker--dashed {
  background-color: transparent;
  background-image: repeating-linear-gradient(
    to bottom,
    rgb(15 23 42 / 0.7) 0 3px,
    transparent 3px 6px
  );
}

/* 轨道渐变的绘制已经交给上层 div，这里清掉浏览器默认外观与轨道 */
.color-range {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
  background: transparent;
}

.color-range:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
  border-radius: 9999px;
}

.color-range::-webkit-slider-runnable-track {
  height: 24px;
  border: 0;
  background: transparent;
}

.color-range::-webkit-slider-thumb {
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

.color-range:active::-webkit-slider-thumb {
  cursor: grabbing;
}

/* Firefox：轨道 / 进度条透明，只保留自绘拇指 */
.color-range::-moz-range-track {
  height: 24px;
  border: 0;
  background: transparent;
}

.color-range::-moz-range-progress {
  background: transparent;
}

.color-range::-moz-range-thumb {
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

.color-range:active::-moz-range-thumb {
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

@media (prefers-reduced-motion: reduce) {
  .number-input {
    transition-duration: 0.001ms;
  }
}
</style>
