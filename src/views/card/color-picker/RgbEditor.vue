<script setup lang="ts">
/**
 * RGB 模式的颜色滑块区（任务书第 2 节）：红 / 绿 / 蓝 / 透明度四行。
 *
 * 每行 = 胶囊轨道 + 数字输入框 + 标签：
 * - 轨道渐变全部按当前颜色在模板里算好（本通道 0→255，其他通道取当前值），
 *   透明度行是同色「透明→不透明」渐变叠在棋盘格上；native input[type=range]
 *   只负责交互与白色圆形拇指，它自己的轨道保持透明
 * - 数字输入框与滑块双向同步；输入过程中允许临时空值 / 越界，
 *   失焦或回车时才夹紧取整；输入框聚焦期间外部颜色变化不会覆盖用户输入
 */
import { computed, reactive, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useI18n } from '@/i18n'
import { clamp, normalizeRgb, type RgbColor } from './color'

type ChannelKey = 'r' | 'g' | 'b' | 'a'

interface ChannelMeta {
  key: ChannelKey
  labelKey: 'colorPicker.red' | 'colorPicker.green' | 'colorPicker.blue' | 'colorPicker.alpha'
  max: number
}

/** 四行的顺序与范围：R / G / B 为 0-255，透明度为 0-100 */
const CHANNELS: readonly ChannelMeta[] = [
  { key: 'r', labelKey: 'colorPicker.red', max: 255 },
  { key: 'g', labelKey: 'colorPicker.green', max: 255 },
  { key: 'b', labelKey: 'colorPicker.blue', max: 255 },
  { key: 'a', labelKey: 'colorPicker.alpha', max: 100 },
]

const props = defineProps<{
  rgb: RgbColor
  alpha: number
}>()

const emit = defineEmits<{
  'update:rgb': [rgb: RgbColor]
  'update:alpha': [alpha: number]
}>()

const { t } = useI18n()

/** 输入框是否聚焦：聚焦中的输入框不跟随外部颜色变化 */
const isFocused = reactive<Record<ChannelKey, boolean>>({ r: false, g: false, b: false, a: false })
/** 输入框正在编辑的文本（允许临时为空 / 越界） */
const drafts = reactive<Record<ChannelKey, string>>({ r: '0', g: '0', b: '0', a: '100' })

function channelValue(key: ChannelKey): number {
  if (key === 'a') return clamp(Math.round(props.alpha), 0, 100)
  return normalizeRgb(props.rgb)[key]
}

/** 轨道渐变：本通道从 0 到最大值，其余通道取当前值 */
function trackStyleFor(key: ChannelKey): CSSProperties {
  const { r, g, b } = normalizeRgb(props.rgb)
  switch (key) {
    case 'r':
      return {
        backgroundImage: `linear-gradient(to right, rgb(0, ${g}, ${b}), rgb(255, ${g}, ${b}))`,
      }
    case 'g':
      return {
        backgroundImage: `linear-gradient(to right, rgb(${r}, 0, ${b}), rgb(${r}, 255, ${b}))`,
      }
    case 'b':
      return {
        backgroundImage: `linear-gradient(to right, rgb(${r}, ${g}, 0), rgb(${r}, ${g}, 255))`,
      }
    default:
      // 透明度：同色渐变叠在棋盘格上（棋盘格从不可见到完全可见），8px 方格
      return {
        backgroundImage:
          `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0), rgb(${r}, ${g}, ${b})), ` +
          'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%)',
        backgroundSize: 'auto, 16px 16px',
      }
  }
}

const rows = computed(() =>
  CHANNELS.map((channel) => ({
    ...channel,
    value: channelValue(channel.key),
    trackStyle: trackStyleFor(channel.key),
  })),
)

function syncDrafts() {
  for (const channel of CHANNELS) {
    if (!isFocused[channel.key]) drafts[channel.key] = String(channelValue(channel.key))
  }
}

watch(() => [props.rgb.r, props.rgb.g, props.rgb.b, props.alpha], syncDrafts, { immediate: true })

/** 统一写入口：夹紧 + 取整；值没变化就不 emit，避免父组件无意义重渲染 */
function setChannel(key: ChannelKey, value: number) {
  if (!Number.isFinite(value)) return

  if (key === 'a') {
    const next = clamp(Math.round(value), 0, 100)
    if (next !== channelValue('a')) emit('update:alpha', next)
    return
  }

  const base = normalizeRgb(props.rgb)
  const next = normalizeRgb({
    r: key === 'r' ? value : base.r,
    g: key === 'g' ? value : base.g,
    b: key === 'b' ? value : base.b,
  })
  if (next.r !== base.r || next.g !== base.g || next.b !== base.b) emit('update:rgb', next)
}

function onRangeInput(key: ChannelKey, event: Event) {
  setChannel(key, Number((event.target as HTMLInputElement).value))
}

function onNumberInput(key: ChannelKey, event: Event) {
  const text = (event.target as HTMLInputElement).value
  drafts[key] = text

  // 编辑过程中只有「合法整数」才实时同步到滑块；空值 / 越界留到失焦或回车时处理
  const value = Number(text)
  if (text.trim() === '' || !Number.isInteger(value)) return
  const max = key === 'a' ? 100 : 255
  if (value < 0 || value > max) return
  setChannel(key, value)
}

/** 提交输入框：空值 / 非法值回退到当前颜色，越界夹紧，小数四舍五入 */
function commitDraft(key: ChannelKey) {
  const text = drafts[key].trim()
  const max = key === 'a' ? 100 : 255
  const parsed = Number(text)
  const next =
    text === '' || !Number.isFinite(parsed) ? channelValue(key) : clamp(Math.round(parsed), 0, max)
  drafts[key] = String(next)
  setChannel(key, next)
}

function onNumberFocus(key: ChannelKey, event: FocusEvent) {
  isFocused[key] = true
  // 聚焦时全选，方便直接输入覆盖
  ;(event.target as HTMLInputElement).select()
}

function onNumberBlur(key: ChannelKey) {
  isFocused[key] = false
  commitDraft(key)
}

function onNumberKeydown(key: ChannelKey, event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitDraft(key)
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    drafts[key] = String(channelValue(key))
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-for="row in rows" :key="row.key" class="flex items-center gap-3">
      <!-- 胶囊轨道：渐变画在这一层，range 本体透明，只露出白色拇指 -->
      <div class="relative h-6 min-w-0 flex-1">
        <div
          class="track pointer-events-none absolute inset-0 overflow-hidden rounded-full"
          :style="row.trackStyle"
        />
        <input
          class="color-range absolute inset-0 h-full w-full cursor-pointer"
          type="range"
          min="0"
          :max="row.max"
          step="1"
          :value="row.value"
          :aria-label="t(row.labelKey)"
          :aria-valuetext="String(row.value)"
          @input="onRangeInput(row.key, $event)"
        />
      </div>

      <input
        class="number-input h-8 w-[68px] shrink-0 rounded-md border border-slate-300 bg-white px-1 text-center text-sm tabular-nums text-slate-700"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        spellcheck="false"
        maxlength="3"
        :value="drafts[row.key]"
        :aria-label="t(row.labelKey)"
        @input="onNumberInput(row.key, $event)"
        @focus="onNumberFocus(row.key, $event)"
        @blur="onNumberBlur(row.key)"
        @keydown="onNumberKeydown(row.key, $event)"
      />

      <span class="w-10 shrink-0 whitespace-nowrap text-sm leading-5 text-slate-600">
        {{ t(row.labelKey) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* 内描边：浅色渐变 / 棋盘格在白色背景上也能看清轨道边界 */
.track {
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 0.12);
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
</style>
