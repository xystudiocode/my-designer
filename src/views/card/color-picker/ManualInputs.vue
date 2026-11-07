<script setup lang="ts">
/**
 * 手动输入：当前模式的全部模式分量 + 不透明度。
 *
 * 交互与现有 HSL / RGB 手动输入一致：
 * - 输入过程中允许临时空值 / 越界 / 小数（合法值实时同步到滑块与色板）；
 * - 失焦或回车时夹紧取整（按分量的 digits），非法值回退当前值；
 * - Esc 放弃编辑；上下方向键按 step 步进（Shift ×10）。
 */
import { computed, reactive, watch } from 'vue'
import { useI18n } from '@/i18n'
import { clamp, type ColorFormat } from './color'
import {
  formatChannelValue,
  isHueChannel,
  modeDefinition,
  type ModeChannelDef,
  type ModeValues,
} from './modes'

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

/** 不透明度在手动输入里作为「额外一路分量」处理 */
const ALPHA_KEY = 'alpha'

interface ManualField {
  key: string
  label: string
  channel: ModeChannelDef | null
  min: number
  max: number
  digits: number
  step: number
  value: number
}

/** 当前模式的输入框：全部分量 + 不透明度 */
const fields = computed<ManualField[]>(() => {
  const list: ManualField[] = modeDefinition(props.mode).channels.map((channel) => {
    const raw = Number(props.values[channel.key])
    const value = Number.isFinite(raw) ? clamp(raw, channel.min, channel.max) : channel.min
    return {
      key: channel.key,
      label: t(channel.labelKey),
      channel,
      min: channel.min,
      max: channel.max,
      digits: channel.digits ?? 0,
      step: channel.step ?? 1,
      value,
    }
  })

  list.push({
    key: ALPHA_KEY,
    label: t('colorPicker.alpha'),
    channel: null,
    min: 0,
    max: 100,
    digits: 0,
    step: 1,
    value: Math.round(clamp(props.alpha, 0, 100)),
  })
  return list
})

/** 输入框正在编辑的文本与聚焦状态 */
const drafts = reactive<Record<string, string>>({})
const focused = reactive<Record<string, boolean>>({})

/** 数值 → 输入框文本（按分量的 digits / 不透明度取整） */
function formatField(field: ManualField, value: number): string {
  if (field.channel) return formatChannelValue(field.channel, value)
  return String(Math.round(clamp(value, 0, 100)))
}

/** 写入一个值：返回实际生效的数值（用于回填输入框） */
function applyField(field: ManualField, value: number): number {
  if (!Number.isFinite(value)) return field.value

  if (!field.channel) {
    const next = Math.round(clamp(value, 0, 100))
    if (next !== Math.round(clamp(props.alpha, 0, 100))) emit('update:alpha', next)
    return next
  }

  const channel = field.channel
  let next = clamp(value, channel.min, channel.max)
  if (isHueChannel(channel)) {
    // 色相按度数取整；360° 与 0° 同色，停在 359.9° 避免滑块拇指跳回左端
    next = Math.min(Math.round(next), 359.9)
  } else if (field.digits > 0) {
    const factor = 10 ** field.digits
    next = Math.round(next * factor) / factor
  } else {
    next = Math.round(next)
  }

  const nextValues = { ...props.values, [channel.key]: next }
  emit('update:values', nextValues)
  return next
}

/** 外部颜色 / 不透明度变化时同步未聚焦的输入框 */
function syncDrafts(): void {
  for (const field of fields.value) {
    if (!focused[field.key]) drafts[field.key] = formatField(field, field.value)
  }
}

watch(() => [props.mode, props.values, props.alpha], syncDrafts, { immediate: true, deep: true })

function onInput(field: ManualField, event: Event): void {
  const text = (event.target as HTMLInputElement).value
  drafts[field.key] = text
  if (text.trim() === '') return

  const parsed = Number(text)
  if (!Number.isFinite(parsed)) return
  // 编辑过程中只有范围合法的值才实时同步；越界留到失焦 / 回车时夹紧
  if (parsed < field.min || parsed > field.max) return
  applyField(field, parsed)
}

/** 提交输入框：空值 / 非法值回退，越界夹紧 */
function commitField(field: ManualField): void {
  const text = (drafts[field.key] ?? '').trim()
  const parsed = Number(text)
  if (text === '' || !Number.isFinite(parsed)) {
    drafts[field.key] = formatField(field, field.value)
    return
  }
  const applied = applyField(field, parsed)
  drafts[field.key] = formatField(field, applied)
}

function onFocus(field: ManualField, event: FocusEvent): void {
  focused[field.key] = true
  // 聚焦时全选，方便直接输入覆盖
  ;(event.target as HTMLInputElement).select()
}

function onBlur(field: ManualField): void {
  focused[field.key] = false
  commitField(field)
}

function onKeydown(field: ManualField, event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitField(field)
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    drafts[field.key] = formatField(field, field.value)
    return
  }
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
    const direction = event.key === 'ArrowUp' ? 1 : -1
    const step = field.step * (event.shiftKey ? 10 : 1)
    const next = applyField(field, field.value + direction * step)
    drafts[field.key] = formatField(field, next)
  }
}
</script>

<template>
  <div class="manual-inputs flex flex-wrap items-center gap-x-4 gap-y-2">
    <label
      v-for="field in fields"
      :key="field.key"
      class="manual-inputs__field flex items-center gap-2"
    >
      <input
        class="number-input h-8 w-[68px] rounded-md border border-slate-300 bg-white px-1 text-center text-sm tabular-nums text-slate-700"
        type="text"
        :inputmode="field.digits > 0 ? 'decimal' : 'numeric'"
        autocomplete="off"
        spellcheck="false"
        maxlength="8"
        :value="drafts[field.key] ?? formatField(field, field.value)"
        :aria-label="field.label"
        @input="onInput(field, $event)"
        @focus="onFocus(field, $event)"
        @blur="onBlur(field)"
        @keydown="onKeydown(field, $event)"
      />
      <span class="whitespace-nowrap text-sm leading-5 text-slate-600">{{ field.label }}</span>
    </label>
  </div>
</template>

<style scoped>
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
