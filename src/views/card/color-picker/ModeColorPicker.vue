<script setup lang="ts">
/**
 * 统一取色器容器（页面唯一入口）。
 *
 * 版式（「滑块和二维图合并」= 两种操作方式同时出现）：
 * - panel-first（HSL / HWB / LAB / OKLCH / YCbCr）：
 *   二维图区域（二维色板 + 右侧竖向滑块 + 横向不透明度）在上；
 *   多滑块区域（全部分量 + 不透明度的横向滑块、手动输入）在下；
 *   最下面还有「控制坐标轴」。
 * - sliders-first（RGB / CMYK）：只有一个多滑块区域（分量 + 不透明度的横向滑块）。
 * - 窄屏（≤1100px）时，二维图区域与多滑块区域的最下面各显示一个「显示颜色」色卡；
 *   宽屏不显示（只保留右栏的「选择颜色」区块）。
 *
 * 模式空间值由 fromRgb(props.rgb) 派生，拖动期间用本地值覆盖 props 回写，
 * 外部改 rgb 时放弃本地值；每次变化 emit update:gamut（仅 OKLCH 超 sRGB 时给出信息）。
 * 坐标轴设置由页面持久化，本组件只 emit 完整的 7 模式 map。
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import {
  COLOR_MODES,
  clamp,
  normalizeRgb,
  type ColorFormat,
  type OutOfGamutInfo,
  type RgbColor,
} from './color'
import { defaultAxisSettings, type AxisSetting, type AxisSettings } from './pickerState'
import {
  channelDefinition,
  modeDefinition,
  normalizeModeValues,
  sanitizeAxisSetting,
  type ModeValues,
} from './modes'
import ColorPanel from './ColorPanel.vue'
import ChannelSliders from './ChannelSliders.vue'
import VerticalChannelSlider from './VerticalChannelSlider.vue'
import OpacitySlider from './OpacitySlider.vue'
import ManualInputs from './ManualInputs.vue'
import AxisControls from './AxisControls.vue'
import DisplayColor from './DisplayColor.vue'

const props = defineProps<{
  mode: ColorFormat
  rgb: RgbColor
  alpha: number
  /** 页面持久化的全部模式坐标轴设置 */
  axes: AxisSettings
}>()

const emit = defineEmits<{
  'update:rgb': [rgb: RgbColor]
  'update:alpha': [alpha: number]
  'update:axes': [axes: AxisSettings]
  'update:gamut': [gamut: OutOfGamutInfo | null]
}>()

const { t } = useI18n()

/** 拖动期间覆盖由 props.rgb 派生的模式空间值 */
const localValues = ref<ModeValues | null>(null)
/** 乐观覆盖坐标轴设置（页面回写 props.axes 后交还控制权） */
const localSetting = ref<AxisSetting | null>(null)
/** 最近一次自己 emit 的 rgb：props 回写时据此区分「外部改动」与「自己改动」 */
let lastEmittedRgb: RgbColor | null = null

const definition = computed(() => modeDefinition(props.mode))
const isSlidersFirst = computed(() => definition.value.layout === 'sliders-first')

/** 当前颜色的模式空间值（来自 props.rgb） */
const baseValues = computed<ModeValues>(() =>
  normalizeModeValues(props.mode, definition.value.fromRgb(normalizeRgb(props.rgb))),
)

const values = computed<ModeValues>(() => localValues.value ?? baseValues.value)

/** 当前模式的坐标轴设置（渲染前先收敛非法的持久化值） */
const setting = computed<AxisSetting>(
  () => localSetting.value ?? sanitizeAxisSetting(props.mode, props.axes?.[props.mode]),
)

/** 当前显示色（模式空间映射回 sRGB，带色域映射；用于不透明度轨道渐变） */
const displayRgb = computed<RgbColor>(() => definition.value.toRgb(values.value))

const xLabel = computed(() => channelLabel(setting.value.x))
const yLabel = computed(() => channelLabel(setting.value.y))
const sliderLabel = computed(() => channelLabel(setting.value.slider))

function channelLabel(key: string): string {
  const channel = channelDefinition(props.mode, key)
  return channel ? t(channel.labelKey) : key
}

/* ------------------------------------------------------------------------------------------
 * 数据流
 * ---------------------------------------------------------------------------------------- */

/** 把颜色信息写回页面：值没变化就不 emit，避免页面无意义重渲染 */
function emitValues(next: ModeValues): void {
  const normalized = normalizeModeValues(props.mode, next)
  localValues.value = normalized

  const nextRgb = definition.value.toRgb(normalized)
  const current = normalizeRgb(props.rgb)
  if (nextRgb.r !== current.r || nextRgb.g !== current.g || nextRgb.b !== current.b) {
    lastEmittedRgb = nextRgb
    emit('update:rgb', nextRgb)
  }
}

function onValues(next: ModeValues): void {
  emitValues(next)
}

function onAlpha(next: number): void {
  const value = Math.round(clamp(next, 0, 100))
  if (value !== Math.round(clamp(props.alpha, 0, 100))) emit('update:alpha', value)
}

/** 坐标轴变化：只改当前模式，其余模式沿用页面上的值，emit 完整的 7 模式 map */
function onSetting(next: AxisSetting): void {
  const sanitized = sanitizeAxisSetting(props.mode, next)
  localSetting.value = sanitized

  const map: AxisSettings = defaultAxisSettings()
  for (const mode of COLOR_MODES) {
    const source = mode === props.mode ? sanitized : props.axes[mode]
    map[mode] = sanitizeAxisSetting(mode, source)
  }
  // defaultAxisSettings() 运行时不含 hex（hex 不是取色模式），类型上补全占位
  map.hex = { ...map.rgb }
  emit('update:axes', map)
}

/** 当前模式空间颜色是否超出 sRGB（只有 OKLCH 会返回非 null） */
function emitGamut(): void {
  emit('update:gamut', definition.value.outOfGamut?.(values.value, props.alpha) ?? null)
}

/**
 * 页面「回退」时调用：放弃拖拽期间保留的本地模式空间值，重新从 props.rgb 派生。
 * 超出 sRGB 的颜色被页面回退到色域映射后的 rgb 时，rgb 可能与回退色相同（不会触发 props 监听），
 * 因此需要页面显式调用它把「选择颜色」恢复为可显示的单张卡片。
 */
function resetToRgb(): void {
  localValues.value = null
  lastEmittedRgb = null
}

defineExpose({ resetToRgb })

/* ------------------------------------------------------------------------------------------
 * 同步 / 重置
 * ---------------------------------------------------------------------------------------- */

// 模式切换：重新从 rgb 派生，并清理本模式的临时状态
watch(
  () => props.mode,
  () => {
    localValues.value = null
    localSetting.value = null
    lastEmittedRgb = null
  },
)

// props.rgb 被外部改动（历史记录 / 调色板 / 取色器等）时放弃本地值；
// 自己 emit 引起的回写要保留本地值（否则色相 359.9° 经 rgb 四舍五入会跳回 0°）
watch(
  () => [props.rgb.r, props.rgb.g, props.rgb.b],
  () => {
    const current = normalizeRgb(props.rgb)
    const isSelfEcho =
      lastEmittedRgb !== null &&
      current.r === lastEmittedRgb.r &&
      current.g === lastEmittedRgb.g &&
      current.b === lastEmittedRgb.b
    if (!isSelfEcho) localValues.value = null
  },
)

// 页面回写坐标轴设置后，结束本地的乐观覆盖
watch(
  () => props.axes,
  () => {
    localSetting.value = null
  },
  { deep: true },
)

// 每次值 / 不透明度 / 模式变化都重算色域信息（模式切换时也要 emit 一次 null 清空卡片）
watch([values, () => props.alpha, () => props.mode], emitGamut, { immediate: true })
</script>

<template>
  <div class="mode-picker flex w-full min-w-0 flex-col gap-4 select-none">
    <!-- ========== 二维图区域（只有 panel-first 模式） ========== -->
    <section v-if="!isSlidersFirst" class="mode-picker__area flex flex-col gap-3">
      <header class="mode-picker__heading flex flex-wrap items-baseline gap-2">
        <h3 class="mode-picker__title">{{ t('colorPicker.panel') }}</h3>
        <span class="mode-picker__meta">
          {{ t('colorPicker.axisX') }} {{ xLabel }} · {{ t('colorPicker.axisY') }} {{ yLabel }} ·
          {{ t('colorPicker.axisSlider') }} {{ sliderLabel }}
        </span>
      </header>

      <!-- 二维色板 + 右侧竖向滑块（竖向滑块随二维色板一起拉伸） -->
      <div class="flex w-full min-w-0 items-stretch gap-3">
        <ColorPanel
          class="min-w-0 flex-1"
          :mode="mode"
          :values="values"
          :x-key="setting.x"
          :y-key="setting.y"
          @update:values="onValues"
        />
        <VerticalChannelSlider
          :mode="mode"
          :values="values"
          :slider-key="setting.slider"
          @update:values="onValues"
        />
      </div>

      <!-- 横向不透明度（与多滑块区域的不透明度行同一份数据） -->
      <OpacitySlider :rgb="displayRgb" :alpha="alpha" @update:alpha="onAlpha" />

      <!-- 窄屏：二维图区域最下面的「显示颜色」 -->
      <div class="mode-picker__narrow-only">
        <div class="mode-picker__display">
          <span class="mode-picker__display-label">{{ t('colorPicker.displayColor') }}</span>
          <DisplayColor :rgb="rgb" :alpha="alpha" />
        </div>
      </div>
    </section>

    <!-- ========== 多滑块区域（所有模式都有） ========== -->
    <section class="mode-picker__area flex flex-col gap-3">
      <header class="mode-picker__heading flex flex-wrap items-baseline gap-2">
        <h3 class="mode-picker__title">{{ t('colorPicker.sliders') }}</h3>
      </header>

      <!-- 全部分量 + 不透明度的横向滑块 -->
      <ChannelSliders
        :mode="mode"
        :values="values"
        :alpha="alpha"
        @update:values="onValues"
        @update:alpha="onAlpha"
      />

      <!-- 手动输入：panel-first 模式放在多滑块区域下方（RGB / CMYK 的滑块行已自带数字输入框） -->
      <ManualInputs
        v-if="!isSlidersFirst"
        :mode="mode"
        :values="values"
        :alpha="alpha"
        @update:values="onValues"
        @update:alpha="onAlpha"
      />

      <!-- 窄屏：多滑块区域最下面的「显示颜色」 -->
      <div class="mode-picker__narrow-only">
        <div class="mode-picker__display">
          <span class="mode-picker__display-label">{{ t('colorPicker.displayColor') }}</span>
          <DisplayColor :rgb="rgb" :alpha="alpha" />
        </div>
      </div>
    </section>

    <!-- 控制坐标轴（仅 panel-first 模式） -->
    <AxisControls
      v-if="!isSlidersFirst"
      :mode="mode"
      :setting="setting"
      @update:setting="onSetting"
    />
  </div>
</template>

<style scoped>
.mode-picker__heading {
  margin: 0;
}

.mode-picker__title {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.mode-picker__meta {
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

/*
 * 窄屏专用「显示颜色」：宽屏隐藏（宽屏只保留右栏的「选择颜色」区块），
 * ≤1100px 显示在二维图区域与多滑块区域的最下面，整体居右。
 */
.mode-picker__narrow-only {
  display: none;
}

.mode-picker__display {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.mode-picker__display-label {
  color: #64748b;
  font-size: 13px;
  line-height: 1.4;
}

@media (max-width: 1100px) {
  .mode-picker__narrow-only {
    display: block;
  }
}
</style>
