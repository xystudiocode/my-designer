/**
 * 取色模式定义（纯数据 / 纯函数，不依赖 Vue）。
 *
 * 每个模式提供：
 * - 分量定义（key / 文案 / 范围 / 小数位 / 步进）；
 * - 模式空间 ↔ sRGB 的互相转换（fromRgb / toRgb / sample）；
 * - 滑块轨道其它分量的基准值（sliderBase）；
 * - OKLCH 独有的色域判定信息（outOfGamut / showGamutLines）。
 *
 * 组件（ModeColorPicker / ColorPanel / ChannelSliders / ManualInputs / AxisControls）
 * 只读取这里的数据，不重复维护模式差异。二维色板的逐像素热路径也放在这里
 * （createPanelSampler 用数字 + 闭包缓存，避免像素循环里创建对象 / 字符串）。
 */
import type { MessageKey } from '@/i18n/messages'
import {
  allLightnessSwatches,
  allLightnessSwatchesInRange,
  cmykToRgb,
  clamp,
  gamutMapLabToRgb,
  gamutMapOklchToRgb,
  gamutMapYcbcrToRgb,
  hslToRgb,
  hwbToRgb,
  labToRgb,
  lightnessSwatches,
  lightnessSwatchesInRange,
  linearChannelToSrgb,
  normalizeRgb,
  oklchGamutStatus,
  oklchToCss,
  oklchToRgb,
  rgbToCmyk,
  rgbToHsl,
  rgbToHwb,
  rgbToLab,
  rgbToOklch,
  rgbToYcbcr,
  ycbcrToRgb,
  type ColorFormat,
  type LightnessSwatch,
  type OklchColor,
  type OutOfGamutInfo,
  type RgbColor,
} from './color'
import { defaultAxisSettings, type AxisSetting } from './pickerState'

export type ModeValues = Record<string, number>

export interface ModeChannelDef {
  key: string
  labelKey: MessageKey
  min: number
  max: number
  /** 手动输入框小数位（默认 0；LAB a/b 1 位、OKLCH c 3 位、OKLCH l 1 位） */
  digits?: number
  /** 滑块 / 输入框步进（默认 1；OKLCH c 0.001、l 0.1） */
  step?: number
}

export interface ModeDefinition {
  mode: ColorFormat
  /** 顺序 = 手动输入与 RGB / CMYK 滑块顺序 */
  channels: readonly ModeChannelDef[]
  defaultSlider: string
  defaultX: string
  defaultY: string
  /** 'sliders-first'（RGB / CMYK）或 'panel-first'（HSL / HWB / LAB / OKLCH / YCbCr） */
  layout: 'sliders-first' | 'panel-first'
  /** 由 sRGB 派生模式空间值 */
  fromRgb(rgb: RgbColor): ModeValues
  /** 模式空间 → 显示用 sRGB（做色域映射，保证可显示；用于「选择颜色」/ 单位面板） */
  toRgb(values: ModeValues): RgbColor
  /** 二维色板采样：不可显示返回 null（画成白色）；其它模式返回裁剪色 */
  sample(values: ModeValues): RgbColor | null
  /** 滑块轨道其它分量的基准值（见 DESIGN 4.2） */
  sliderBase(sliderKey: string, values: ModeValues): ModeValues
  /** 是否在二维色板画 P3 / REC2020 色域线（仅 OKLCH 为 true） */
  showGamutLines?: boolean
  /** 超出 sRGB 时的卡片信息（仅 OKLCH 返回非 null） */
  outOfGamut?(values: ModeValues, alpha: number): OutOfGamutInfo | null
}

/* ------------------------------------------------------------------------------------------
 * 基础工具
 * ---------------------------------------------------------------------------------------- */

/** 从 ModeValues 里安全取一个数值（缺失 / 非数字时回退 min） */
function num(value: number | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** 色相类分量（hsl / hwb / oklch 的 h）：按 360° 环绕，右端用 359.9° */
export function isHueChannel(channel: ModeChannelDef): boolean {
  return channel.key === 'h' && channel.max === 360
}

export function clampChannel(channel: ModeChannelDef, value: number): number {
  if (!Number.isFinite(value)) return channel.min
  return clamp(value, channel.min, channel.max)
}

/** 把某个分量序列化为展示文本（按 digits 四舍五入，不带单位） */
export function formatChannelValue(channel: ModeChannelDef, value: number): string {
  const digits = channel.digits ?? 0
  if (digits <= 0) return String(Math.round(clampChannel(channel, value)))
  const factor = 10 ** digits
  return String(Math.round(clampChannel(channel, value) * factor) / factor)
}

/** 取某个模式下的分量定义（坐标轴 / 手动输入用） */
export function channelDefinition(mode: ColorFormat, key: string): ModeChannelDef | undefined {
  return modeDefinition(mode).channels.find((channel) => channel.key === key)
}

/** 分量定义里当前模式通道的 key 列表 */
function channelKeys(mode: ColorFormat): string[] {
  return modeDefinition(mode).channels.map((channel) => channel.key)
}

/** 0-1 的比例 → 分量值（x 轴左→右、y 轴下→上都是 min→max） */
export function channelValueAtRatio(channel: ModeChannelDef, ratio: number): number {
  const value = channel.min + (channel.max - channel.min) * clamp(ratio, 0, 1)
  // 360° 与 0° 同色：右端停在 359.9°，避免松手后拇指从右端跳回左端
  return isHueChannel(channel) ? Math.min(value, 359.9) : value
}

/* ------------------------------------------------------------------------------------------
 * 分量定义（key / 文案 / 范围 / 精度）
 * ---------------------------------------------------------------------------------------- */

const RGB_CHANNELS: readonly ModeChannelDef[] = [
  { key: 'r', labelKey: 'colorPicker.red', min: 0, max: 255 },
  { key: 'g', labelKey: 'colorPicker.green', min: 0, max: 255 },
  { key: 'b', labelKey: 'colorPicker.blue', min: 0, max: 255 },
]

const CMYK_CHANNELS: readonly ModeChannelDef[] = [
  { key: 'c', labelKey: 'colorPicker.cyan', min: 0, max: 100 },
  { key: 'm', labelKey: 'colorPicker.magenta', min: 0, max: 100 },
  { key: 'y', labelKey: 'colorPicker.yellow', min: 0, max: 100 },
  { key: 'k', labelKey: 'colorPicker.keyBlack', min: 0, max: 100 },
]

const HSL_CHANNELS: readonly ModeChannelDef[] = [
  { key: 'h', labelKey: 'colorPicker.hue', min: 0, max: 360 },
  { key: 's', labelKey: 'colorPicker.saturation', min: 0, max: 100 },
  { key: 'l', labelKey: 'colorPicker.lightness', min: 0, max: 100 },
]

const HWB_CHANNELS: readonly ModeChannelDef[] = [
  { key: 'h', labelKey: 'colorPicker.hue', min: 0, max: 360 },
  { key: 'w', labelKey: 'colorPicker.whiteness', min: 0, max: 100 },
  { key: 'b', labelKey: 'colorPicker.blackness', min: 0, max: 100 },
]

const LAB_CHANNELS: readonly ModeChannelDef[] = [
  { key: 'l', labelKey: 'colorPicker.lightness', min: 0, max: 100 },
  { key: 'a', labelKey: 'colorPicker.labA', min: -128, max: 127, digits: 1 },
  { key: 'b', labelKey: 'colorPicker.labB', min: -128, max: 127, digits: 1 },
]

const OKLCH_CHANNELS: readonly ModeChannelDef[] = [
  { key: 'l', labelKey: 'colorPicker.lightness', min: 0, max: 100, digits: 1, step: 0.1 },
  { key: 'c', labelKey: 'colorPicker.chroma', min: 0, max: 0.4, digits: 3, step: 0.001 },
  { key: 'h', labelKey: 'colorPicker.hue', min: 0, max: 360 },
]

const YCBCR_CHANNELS: readonly ModeChannelDef[] = [
  { key: 'y', labelKey: 'colorPicker.luma', min: 0, max: 255 },
  { key: 'cb', labelKey: 'colorPicker.cb', min: 0, max: 255 },
  { key: 'cr', labelKey: 'colorPicker.cr', min: 0, max: 255 },
]

/* ------------------------------------------------------------------------------------------
 * 各模式定义
 * ---------------------------------------------------------------------------------------- */

/** 各模式的默认坐标轴（与 pickerState 保持一致，避免两处维护） */
const AXIS: ReturnType<typeof defaultAxisSettings> = defaultAxisSettings()

const rgbDefinition: ModeDefinition = {
  mode: 'rgb',
  channels: RGB_CHANNELS,
  defaultSlider: AXIS.rgb.slider,
  defaultX: AXIS.rgb.x,
  defaultY: AXIS.rgb.y,
  layout: 'sliders-first',
  fromRgb(rgb) {
    const color = normalizeRgb(rgb)
    return { r: color.r, g: color.g, b: color.b }
  },
  toRgb(values) {
    return normalizeRgb({ r: num(values.r), g: num(values.g), b: num(values.b) })
  },
  sample(values) {
    return normalizeRgb({ r: num(values.r), g: num(values.g), b: num(values.b) })
  },
  sliderBase(_sliderKey, values) {
    const color = normalizeRgb({ r: num(values.r), g: num(values.g), b: num(values.b) })
    return { r: color.r, g: color.g, b: color.b }
  },
}

const cmykDefinition: ModeDefinition = {
  mode: 'cmyk',
  channels: CMYK_CHANNELS,
  defaultSlider: AXIS.cmyk.slider,
  defaultX: AXIS.cmyk.x,
  defaultY: AXIS.cmyk.y,
  layout: 'sliders-first',
  fromRgb(rgb) {
    const cmyk = rgbToCmyk(normalizeRgb(rgb))
    return { c: cmyk.c, m: cmyk.m, y: cmyk.y, k: cmyk.k }
  },
  toRgb(values) {
    return cmykToRgb({
      c: num(values.c),
      m: num(values.m),
      y: num(values.y),
      k: num(values.k),
    })
  },
  sample(values) {
    return cmykDefinition.toRgb(values)
  },
  sliderBase(_sliderKey, values) {
    return normalizeModeValues('cmyk', values)
  },
}

const hslDefinition: ModeDefinition = {
  mode: 'hsl',
  channels: HSL_CHANNELS,
  defaultSlider: AXIS.hsl.slider,
  defaultX: AXIS.hsl.x,
  defaultY: AXIS.hsl.y,
  layout: 'panel-first',
  fromRgb(rgb) {
    const hsl = rgbToHsl(normalizeRgb(rgb))
    return { h: hsl.h, s: hsl.s, l: hsl.l }
  },
  toRgb(values) {
    return hslToRgb({ h: num(values.h), s: num(values.s), l: num(values.l) })
  },
  sample(values) {
    return hslToRgb({ h: num(values.h), s: num(values.s), l: num(values.l) })
  },
  sliderBase(sliderKey, values) {
    switch (sliderKey) {
      case 'h':
        return { h: num(values.h), s: 100, l: 50 }
      case 's':
        return { h: 0, s: num(values.s), l: 50 }
      case 'l':
        return { h: 0, s: 0, l: num(values.l) }
      default:
        return normalizeModeValues('hsl', values)
    }
  },
}

const hwbDefinition: ModeDefinition = {
  mode: 'hwb',
  channels: HWB_CHANNELS,
  defaultSlider: AXIS.hwb.slider,
  defaultX: AXIS.hwb.x,
  defaultY: AXIS.hwb.y,
  layout: 'panel-first',
  fromRgb(rgb) {
    const hwb = rgbToHwb(normalizeRgb(rgb))
    return { h: hwb.h, w: hwb.w, b: hwb.b }
  },
  toRgb(values) {
    return hwbToRgb({ h: num(values.h), w: num(values.w), b: num(values.b) })
  },
  sample(values) {
    return hwbToRgb({ h: num(values.h), w: num(values.w), b: num(values.b) })
  },
  sliderBase(sliderKey, values) {
    switch (sliderKey) {
      case 'h':
        return { h: num(values.h), w: 0, b: 0 }
      case 'w':
        return { h: 0, w: num(values.w), b: 0 }
      case 'b':
        return { h: 0, w: 0, b: num(values.b) }
      default:
        return normalizeModeValues('hwb', values)
    }
  },
}

const labDefinition: ModeDefinition = {
  mode: 'lab',
  channels: LAB_CHANNELS,
  defaultSlider: AXIS.lab.slider,
  defaultX: AXIS.lab.x,
  defaultY: AXIS.lab.y,
  layout: 'panel-first',
  fromRgb(rgb) {
    const lab = rgbToLab(normalizeRgb(rgb))
    return { l: lab.l, a: lab.a, b: lab.b }
  },
  toRgb(values) {
    return labToRgb({ l: num(values.l), a: num(values.a), b: num(values.b) })
  },
  sample(values) {
    return labToRgb({ l: num(values.l), a: num(values.a), b: num(values.b) })
  },
  sliderBase(sliderKey, values) {
    switch (sliderKey) {
      case 'l':
        return { l: num(values.l), a: 0, b: 0 }
      case 'a':
        return { l: 50, a: num(values.a), b: 0 }
      case 'b':
        return { l: 50, a: 0, b: num(values.b) }
      default:
        return normalizeModeValues('lab', values)
    }
  },
}

/** 把 ModeValues 读成 OKLCH（超出分量范围时夹紧） */
function oklchOf(values: ModeValues): OklchColor {
  return {
    l: clamp(num(values.l), 0, 100),
    c: Math.max(0, num(values.c)),
    h: ((num(values.h) % 360) + 360) % 360,
  }
}

const oklchDefinition: ModeDefinition = {
  mode: 'oklch',
  channels: OKLCH_CHANNELS,
  defaultSlider: AXIS.oklch.slider,
  defaultX: AXIS.oklch.x,
  defaultY: AXIS.oklch.y,
  layout: 'panel-first',
  showGamutLines: true,
  fromRgb(rgb) {
    const oklch = rgbToOklch(normalizeRgb(rgb))
    return { l: oklch.l, c: oklch.c, h: oklch.h }
  },
  // 显示用颜色：超出 sRGB 时做 CSS Color 4 降彩度映射，保证「选择颜色」卡片可显示
  toRgb(values) {
    return gamutMapOklchToRgb(oklchOf(values))
  },
  // 二维色板：超出 sRGB 的像素返回 null（画白色）
  sample(values) {
    const oklch = oklchOf(values)
    return oklchGamutStatus(oklch).inSrgb ? oklchToRgb(oklch) : null
  },
  sliderBase(sliderKey, values) {
    switch (sliderKey) {
      case 'l':
        return { l: num(values.l), c: 0, h: 0 }
      case 'c':
        return { l: 60, c: num(values.c), h: 0 }
      case 'h':
        // 参考色相滑块基准：L=60、C=0.12 时大部分色相都能显示，
        // 只有蓝 / 青 / 洋红一带露出不可显示段（形成连贯彩虹 + 少量虚线边界）
        return { l: 60, c: 0.12, h: num(values.h) }
      default:
        return normalizeModeValues('oklch', values)
    }
  },
  outOfGamut(values, alpha) {
    const oklch = oklchOf(values)
    if (oklchGamutStatus(oklch).inSrgb) return null
    return {
      mode: 'oklch',
      css: oklchToCss(oklch, alpha),
      browserRgb: oklchToRgb(oklch),
      fallbackRgb: gamutMapOklchToRgb(oklch),
    }
  },
}

const ycbcrDefinition: ModeDefinition = {
  mode: 'ycbcr',
  channels: YCBCR_CHANNELS,
  defaultSlider: AXIS.ycbcr.slider,
  defaultX: AXIS.ycbcr.x,
  defaultY: AXIS.ycbcr.y,
  layout: 'panel-first',
  fromRgb(rgb) {
    const ycbcr = rgbToYcbcr(normalizeRgb(rgb))
    return { y: ycbcr.y, cb: ycbcr.cb, cr: ycbcr.cr }
  },
  toRgb(values) {
    return ycbcrToRgb({ y: num(values.y), cb: num(values.cb), cr: num(values.cr) })
  },
  sample(values) {
    return ycbcrToRgb({ y: num(values.y), cb: num(values.cb), cr: num(values.cr) })
  },
  sliderBase(sliderKey, values) {
    switch (sliderKey) {
      case 'y':
        return { y: num(values.y), cb: 128, cr: 128 }
      case 'cb':
        return { y: 128, cb: num(values.cb), cr: 128 }
      case 'cr':
        return { y: 128, cb: 128, cr: num(values.cr) }
      default:
        return normalizeModeValues('ycbcr', values)
    }
  },
}

/**
 * 7 个取色模式的完整定义。
 * `hex` 只是右侧单位面板的展示格式、不能作为取色模式；为了让
 * `Record<ColorFormat, ModeDefinition>` 类型完整，这里复用 RGB 定义（不会被页面用到）。
 */
export const MODE_DEFINITIONS: Record<ColorFormat, ModeDefinition> = {
  rgb: rgbDefinition,
  cmyk: cmykDefinition,
  hsl: hslDefinition,
  hwb: hwbDefinition,
  lab: labDefinition,
  oklch: oklchDefinition,
  ycbcr: ycbcrDefinition,
  hex: rgbDefinition,
}

export function modeDefinition(mode: ColorFormat): ModeDefinition {
  return MODE_DEFINITIONS[mode === 'hex' ? 'rgb' : mode]
}

/** 把任意来源的分量值收敛到该模式的合法范围（色相按 360° 环绕） */
export function normalizeModeValues(mode: ColorFormat, values: ModeValues): ModeValues {
  const result: ModeValues = {}
  for (const channel of modeDefinition(mode).channels) {
    const raw = values[channel.key]
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : channel.min
    result[channel.key] = isHueChannel(channel)
      ? ((value % 360) + 360) % 360
      : clampChannel(channel, value)
  }
  return result
}

/** 默认坐标轴设置（与 pickerState 的默认值一致） */
export function defaultAxisSetting(mode: ColorFormat): AxisSetting {
  const settings = defaultAxisSettings()
  return { ...settings[mode === 'hex' ? 'rgb' : mode] }
}

/** 校验 / 修正坐标轴设置：三个 key 必须都属于该模式且互不相同，否则回退默认值 */
export function sanitizeAxisSetting(mode: ColorFormat, value: unknown): AxisSetting {
  const fallback = defaultAxisSetting(mode)
  if (!value || typeof value !== 'object') return fallback

  const record = value as Record<string, unknown>
  const slider = record.slider
  const x = record.x
  const y = record.y
  if (typeof slider !== 'string' || typeof x !== 'string' || typeof y !== 'string') {
    return fallback
  }

  const keys = channelKeys(mode)
  if (!keys.includes(slider) || !keys.includes(x) || !keys.includes(y)) return fallback
  if (new Set([slider, x, y]).size !== 3) return fallback
  return { slider, x, y }
}

/* ------------------------------------------------------------------------------------------
 * 配色助手的亮度色板
 *
 * 配色助手的「基于亮度信息 / 所有亮度配色信息」两套色板按当前取色模式的「亮度属性」生成：
 * LAB / OKLCH 用 L，YCbCr 用 Y；其余模式（RGB / HSL / HWB / CMYK）沿用 HSL 亮度（原有行为）。
 * 偏移量按亮度通道的取值范围取百分比：LAB / OKLCH 的 L 是 0-100（5% = 5），
 * YCbCr 的 Y 是 0-255（5% ≈ 12.75），标签仍是 ±5% / 5% 这类百分比。
 * ---------------------------------------------------------------------------------------- */

/** 使用「模式自身亮度」生成配色助手的模式 → 亮度通道 key（其余模式用 HSL 亮度） */
const MODE_LIGHTNESS_CHANNELS: Partial<Record<ColorFormat, string>> = {
  lab: 'l',
  oklch: 'l',
  ycbcr: 'y',
}

export interface AssistantLightnessPalettes {
  /** 基于当前亮度的 ±5% 一档色板 */
  byLightness: LightnessSwatch[]
  /** 忽略当前亮度、固定 5%-100% 的色板 */
  allLightness: LightnessSwatch[]
  /** 亮度来源：`'hsl'` 表示沿用 HSL 亮度，否则为该模式的亮度通道 key */
  source: 'hsl' | string
}

/** 沿用 HSL 亮度的模式（RGB / HSL / HWB / CMYK / hex） */
function hslLightnessPalettes(rgb: RgbColor): AssistantLightnessPalettes {
  const hsl = rgbToHsl(normalizeRgb(rgb))
  return {
    byLightness: lightnessSwatches(hsl),
    allLightness: allLightnessSwatches(hsl),
    source: 'hsl',
  }
}

/**
 * 配色助手的两套亮度色板：
 * LAB / OKLCH / YCbCr 按当前取色模式的亮度属性生成，其它模式用 HSL 亮度。
 * 色板颜色会保持该模式的亮度（必要时降低彩度 / 色差强度），因此 100% 档接近白色、
 * 0% 档接近黑色，中间档位保留尽量多的色相，不会因为 sRGB 通道裁剪而整段偏色。
 */
export function assistantLightnessPalettes(
  mode: ColorFormat,
  rgb: RgbColor,
): AssistantLightnessPalettes {
  const definition = modeDefinition(mode)
  const lightnessKey = MODE_LIGHTNESS_CHANNELS[definition.mode]
  if (!lightnessKey) return hslLightnessPalettes(rgb)

  const channel = definition.channels.find((item) => item.key === lightnessKey)
  if (!channel) return hslLightnessPalettes(rgb)

  const values = normalizeModeValues(definition.mode, definition.fromRgb(normalizeRgb(rgb)))

  /** 模式空间值 → 保持亮度的可显示 sRGB */
  const toColor = (value: number): RgbColor => {
    const next: ModeValues = { ...values, [lightnessKey]: value }
    switch (definition.mode) {
      case 'lab':
        return gamutMapLabToRgb({ l: next.l ?? 0, a: next.a ?? 0, b: next.b ?? 0 })
      case 'ycbcr':
        return gamutMapYcbcrToRgb({ y: next.y ?? 0, cb: next.cb ?? 128, cr: next.cr ?? 128 })
      default:
        // OKLCH：definition.toRgb 本身就是「保持 L / H、降低彩度」的色域映射
        return definition.toRgb(next)
    }
  }

  const current = values[lightnessKey] ?? channel.min
  return {
    byLightness: lightnessSwatchesInRange(current, channel.min, channel.max, toColor),
    allLightness: allLightnessSwatchesInRange(channel.min, channel.max, toColor),
    source: lightnessKey,
  }
}

/* ------------------------------------------------------------------------------------------
 * 二维色板逐像素采样（热路径）
 *
 * 面板每帧要算几十万像素，这里全部用数字 + 闭包缓存：
 * 每次采样只写入调用方复用的 PanelSample，不创建对象 / 字符串。
 * 转换公式与 color.ts 中对应的转换函数完全一致（color.ts 是契约来源）。
 * ---------------------------------------------------------------------------------------- */

/** 二维色板逐像素采样的复用输出容器 */
export interface PanelSample {
  /** 打包的 0xRRGGBB；-1 表示不可显示（调用方画白色） */
  rgb: number
  inSrgb: boolean
  inP3: boolean
  inRec2020: boolean
}

export type PanelSampler = (xRatio: number, yRatio: number, out: PanelSample) => void

/** 色域判定容差，与 color.ts 的 inGamutLinear 默认值一致 */
const GAMUT_EPSILON = 1e-4

/** 线性 sRGB → XYZ(D65) */
const LINEAR_SRGB_TO_XYZ = [
  0.4123907992659595, 0.357584339383878, 0.1804807884018343, 0.2126390058715104, 0.7151686787677561,
  0.0721923153607337, 0.0193308187155918, 0.119194779794626, 0.9505321522496607,
]

/** XYZ(D65) → 线性 Display P3 */
const XYZ_TO_LINEAR_P3 = [
  2.4934969119414254, -0.9313836179191239, -0.4027107844507168, -0.8294889695615748,
  1.7626640603183465, 0.0236246858419436, 0.0358458302437845, -0.0761723892680418,
  0.9568845240076872,
]

/** XYZ(D65) → 线性 REC 2020 */
const XYZ_TO_LINEAR_REC2020 = [
  1.7166511879712674, -0.3556707837763925, -0.2533662813736599, -0.6666843518324891,
  1.6164812366349395, 0.0157685458139111, 0.0176398574453108, -0.0427706132578085,
  0.9421031212354739,
]

/** XYZ(D65) → 线性 sRGB */
const XYZ_TO_LINEAR_SRGB = [
  3.2409699419045226, -1.5373831775700939, -0.4986107602930034, -0.9692436362808796,
  1.8759675015077202, 0.0415550574071756, 0.0556300796969936, -0.2039769588889765,
  1.0569715142428786,
]

function linearInGamut(r: number, g: number, b: number): boolean {
  return (
    r >= -GAMUT_EPSILON &&
    r <= 1 + GAMUT_EPSILON &&
    g >= -GAMUT_EPSILON &&
    g <= 1 + GAMUT_EPSILON &&
    b >= -GAMUT_EPSILON &&
    b <= 1 + GAMUT_EPSILON
  )
}

/** 线性 RGB 三通道（0-1）→ 打包的 0xRRGGBB（逐通道裁剪） */
function packLinear(r: number, g: number, b: number): number {
  return packRgb(linearChannelToSrgb(r), linearChannelToSrgb(g), linearChannelToSrgb(b))
}

/** 0-255 三通道 → 打包的 0xRRGGBB（逐通道裁剪） */
function packRgb(r: number, g: number, b: number): number {
  const red = Math.round(clamp(r, 0, 255))
  const green = Math.round(clamp(g, 0, 255))
  const blue = Math.round(clamp(b, 0, 255))
  return (red << 16) | (green << 8) | blue
}

/** hsl → 打包 sRGB（与 color.ts 的 hslToRgb 相同公式） */
function hslToPacked(h: number, s: number, l: number): number {
  const hue = ((h % 360) + 360) % 360
  const saturation = clamp(s, 0, 100) / 100
  const lightness = clamp(l, 0, 100) / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const offset = lightness - chroma / 2

  let red = 0
  let green = 0
  let blue = 0
  if (hue < 60) {
    red = chroma
    green = second
  } else if (hue < 120) {
    red = second
    green = chroma
  } else if (hue < 180) {
    green = chroma
    blue = second
  } else if (hue < 240) {
    green = second
    blue = chroma
  } else if (hue < 300) {
    red = second
    blue = chroma
  } else {
    red = chroma
    blue = second
  }
  return packRgb((red + offset) * 255, (green + offset) * 255, (blue + offset) * 255)
}

/** hwb → 打包 sRGB（与 color.ts 的 hwbToRgb 相同公式） */
function hwbToPacked(h: number, w: number, b: number): number {
  const hue = ((h % 360) + 360) % 360
  const white = clamp(w, 0, 100) / 100
  const black = clamp(b, 0, 100) / 100
  if (white + black >= 1) {
    const gray = white / (white + black)
    return packRgb(gray * 255, gray * 255, gray * 255)
  }

  // 纯色相（s = 100、l = 50）：chroma = 1、offset = 0
  const second = 1 - Math.abs(((hue / 60) % 2) - 1)
  let red = 0
  let green = 0
  let blue = 0
  if (hue < 60) {
    red = 1
    green = second
  } else if (hue < 120) {
    red = second
    green = 1
  } else if (hue < 180) {
    green = 1
    blue = second
  } else if (hue < 240) {
    green = second
    blue = 1
  } else if (hue < 300) {
    red = second
    blue = 1
  } else {
    red = 1
    blue = second
  }

  const scale = 1 - white - black
  return packRgb(
    (red * scale + white) * 255,
    (green * scale + white) * 255,
    (blue * scale + white) * 255,
  )
}

/** LAB → 打包 sRGB（与 color.ts 的 labToRgb 相同公式） */
function labToPacked(l: number, a: number, b: number): number {
  const lightness = clamp(l, 0, 100)
  const fy = (lightness + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200

  const epsilon = 216 / 24389
  const kappa = 24389 / 27
  const inverse = (value: number) =>
    value ** 3 > epsilon ? value ** 3 : (116 * value - 16) / kappa

  const x = inverse(fx) * 0.95047
  const y = inverse(fy)
  const z = inverse(fz) * 1.08883

  const linearR =
    XYZ_TO_LINEAR_SRGB[0]! * x + XYZ_TO_LINEAR_SRGB[1]! * y + XYZ_TO_LINEAR_SRGB[2]! * z
  const linearG =
    XYZ_TO_LINEAR_SRGB[3]! * x + XYZ_TO_LINEAR_SRGB[4]! * y + XYZ_TO_LINEAR_SRGB[5]! * z
  const linearB =
    XYZ_TO_LINEAR_SRGB[6]! * x + XYZ_TO_LINEAR_SRGB[7]! * y + XYZ_TO_LINEAR_SRGB[8]! * z
  return packLinear(linearR, linearG, linearB)
}

/** YCbCr → 打包 sRGB（与 color.ts 的 ycbcrToRgb 相同公式） */
function ycbcrToPacked(y: number, cb: number, cr: number): number {
  const luma = clamp(y, 0, 255)
  const blueDifference = clamp(cb, 0, 255) - 128
  const redDifference = clamp(cr, 0, 255) - 128
  return packRgb(
    luma + 1.402 * redDifference,
    luma - 0.344136 * blueDifference - 0.714136 * redDifference,
    luma + 1.772 * blueDifference,
  )
}

/** 全部视为可显示（1 CSS px 色域线只对 OKLCH 有意义） */
function markVisible(out: PanelSample, rgb: number): void {
  out.rgb = rgb
  out.inSrgb = true
  out.inP3 = true
  out.inRec2020 = true
}

/**
 * 创建二维色板采样器（闭包缓存分量范围 / 固定滑块值）。
 *
 * - xRatio 左 0 → 右 1；yRatio 上 0 → 下 1（y 轴上方对应最大值）。
 * - 只支持 3 分量模式（二维色板的所有模式都是 3 分量；RGB / CMYK 没有二维色板）。
 */
export function createPanelSampler(
  mode: ColorFormat,
  values: ModeValues,
  xKey: string,
  yKey: string,
): PanelSampler {
  const definition = modeDefinition(mode)
  const channels = definition.channels
  const xChannel = channels.find((channel) => channel.key === xKey) ?? channels[0]
  const yChannel =
    channels.find((channel) => channel.key === yKey && channel.key !== xChannel?.key) ?? channels[1]
  if (!xChannel || !yChannel || channels.length !== 3) {
    // 非法坐标轴组合（正常不会出现）：退化为固定颜色，保证不崩
    const fixed = definition.toRgb(values)
    return (_xRatio, _yRatio, out) => markVisible(out, packRgb(fixed.r, fixed.g, fixed.b))
  }

  const xIndex = channels.indexOf(xChannel)
  const yIndex = channels.indexOf(yChannel)
  const sliderIndex = channels.findIndex(
    (channel) => channel.key !== xChannel.key && channel.key !== yChannel.key,
  )
  if (sliderIndex < 0) {
    const fixed = definition.toRgb(values)
    return (_xRatio, _yRatio, out) => markVisible(out, packRgb(fixed.r, fixed.g, fixed.b))
  }

  // 三个分量按 channels 顺序存成数字数组（闭包内复用，每像素只改两个）
  const slots: number[] = channels.map((channel) => clampChannel(channel, num(values[channel.key])))

  /** 把指针比例写进 x / y 分量（固定滑块分量保持不变） */
  const applyRatios = (xRatio: number, yRatio: number): void => {
    slots[xIndex] = channelValueAtRatio(xChannel, xRatio)
    slots[yIndex] = channelValueAtRatio(yChannel, 1 - yRatio)
  }

  switch (definition.mode) {
    case 'hsl':
      return (xRatio, yRatio, out) => {
        applyRatios(xRatio, yRatio)
        markVisible(out, hslToPacked(slots[0] ?? 0, slots[1] ?? 0, slots[2] ?? 0))
      }

    case 'hwb':
      return (xRatio, yRatio, out) => {
        applyRatios(xRatio, yRatio)
        markVisible(out, hwbToPacked(slots[0] ?? 0, slots[1] ?? 0, slots[2] ?? 0))
      }

    case 'lab':
      return (xRatio, yRatio, out) => {
        applyRatios(xRatio, yRatio)
        markVisible(out, labToPacked(slots[0] ?? 0, slots[1] ?? 0, slots[2] ?? 0))
      }

    case 'ycbcr':
      return (xRatio, yRatio, out) => {
        applyRatios(xRatio, yRatio)
        markVisible(out, ycbcrToPacked(slots[0] ?? 0, slots[1] ?? 0, slots[2] ?? 0))
      }

    case 'oklch':
      return (xRatio, yRatio, out) => {
        applyRatios(xRatio, yRatio)

        // 分量顺序固定为 l / c / h
        const lightness = clamp(slots[0] ?? 0, 0, 100) / 100
        const chroma = Math.max(0, slots[1] ?? 0)
        const hue = (((slots[2] ?? 0) % 360) + 360) % 360
        const radians = (hue * Math.PI) / 180
        const a = chroma * Math.cos(radians)
        const b = chroma * Math.sin(radians)

        // OKLab → 线性 sRGB（与 color.ts 的 oklchToLinearSrgb 相同）
        const lCube = lightness + 0.3963377774 * a + 0.2158037573 * b
        const mCube = lightness - 0.1055613458 * a - 0.0638541728 * b
        const sCube = lightness - 0.0894841775 * a - 1.291485548 * b
        const lm = lCube ** 3
        const mm = mCube ** 3
        const sm = sCube ** 3
        const linearR = 4.0767416621 * lm - 3.3077115913 * mm + 0.2309699292 * sm
        const linearG = -1.2684380046 * lm + 2.6097574011 * mm - 0.3413193965 * sm
        const linearB = -0.0041960863 * lm - 0.7034186147 * mm + 1.707614701 * sm

        if (linearInGamut(linearR, linearG, linearB)) {
          markVisible(out, packLinear(linearR, linearG, linearB))
          return
        }

        // 超出 sRGB：像素画白色，但仍要判定 P3 / REC2020 色域，供画边界线
        out.rgb = -1
        out.inSrgb = false

        // 线性 sRGB → XYZ → 线性 P3
        const xyzX =
          LINEAR_SRGB_TO_XYZ[0]! * linearR +
          LINEAR_SRGB_TO_XYZ[1]! * linearG +
          LINEAR_SRGB_TO_XYZ[2]! * linearB
        const xyzY =
          LINEAR_SRGB_TO_XYZ[3]! * linearR +
          LINEAR_SRGB_TO_XYZ[4]! * linearG +
          LINEAR_SRGB_TO_XYZ[5]! * linearB
        const xyzZ =
          LINEAR_SRGB_TO_XYZ[6]! * linearR +
          LINEAR_SRGB_TO_XYZ[7]! * linearG +
          LINEAR_SRGB_TO_XYZ[8]! * linearB

        const p3R =
          XYZ_TO_LINEAR_P3[0]! * xyzX + XYZ_TO_LINEAR_P3[1]! * xyzY + XYZ_TO_LINEAR_P3[2]! * xyzZ
        const p3G =
          XYZ_TO_LINEAR_P3[3]! * xyzX + XYZ_TO_LINEAR_P3[4]! * xyzY + XYZ_TO_LINEAR_P3[5]! * xyzZ
        const p3B =
          XYZ_TO_LINEAR_P3[6]! * xyzX + XYZ_TO_LINEAR_P3[7]! * xyzY + XYZ_TO_LINEAR_P3[8]! * xyzZ
        out.inP3 = linearInGamut(p3R, p3G, p3B)
        if (out.inP3) {
          out.inRec2020 = true
          return
        }

        const recR =
          XYZ_TO_LINEAR_REC2020[0]! * xyzX +
          XYZ_TO_LINEAR_REC2020[1]! * xyzY +
          XYZ_TO_LINEAR_REC2020[2]! * xyzZ
        const recG =
          XYZ_TO_LINEAR_REC2020[3]! * xyzX +
          XYZ_TO_LINEAR_REC2020[4]! * xyzY +
          XYZ_TO_LINEAR_REC2020[5]! * xyzZ
        const recB =
          XYZ_TO_LINEAR_REC2020[6]! * xyzX +
          XYZ_TO_LINEAR_REC2020[7]! * xyzY +
          XYZ_TO_LINEAR_REC2020[8]! * xyzZ
        out.inRec2020 = linearInGamut(recR, recG, recB)
      }

    case 'rgb':
      return (xRatio, yRatio, out) => {
        applyRatios(xRatio, yRatio)
        markVisible(out, packRgb(slots[0] ?? 0, slots[1] ?? 0, slots[2] ?? 0))
      }

    case 'cmyk': {
      // CMYK 有 4 个分量、正常不会使用二维色板；这里只做固定色兜底
      const fixed = definition.toRgb(values)
      return (_xRatio, _yRatio, out) => markVisible(out, packRgb(fixed.r, fixed.g, fixed.b))
    }

    default:
      return (_xRatio, _yRatio, out) => markVisible(out, packRgb(0, 0, 0))
  }
}
