/**
 * 颜色转换 / 格式化工具（纯函数，不依赖 Vue）。
 *
 * 内部统一用 sRGB 0-255 整数表示颜色，透明度用 0-100 的百分比。
 * 右侧单位面板与配色助手子菜单共用 `formatColor()`，保证展示一致。
 */

export type ColorFormat = 'rgb' | 'hex' | 'hsl' | 'hwb' | 'lab' | 'oklch' | 'cmyk' | 'ycbcr'

/** 右侧单位面板展示顺序（含只读的 HEX） */
export const COLOR_FORMATS: readonly ColorFormat[] = [
  'rgb',
  'hex',
  'hsl',
  'hwb',
  'lab',
  'oklch',
  'cmyk',
  'ycbcr',
]

/** 「选择模式」可选项：HEX 只是展示格式，不能作为取色模式 */
export const COLOR_MODES: readonly ColorFormat[] = [
  'rgb',
  'hsl',
  'hwb',
  'lab',
  'oklch',
  'cmyk',
  'ycbcr',
]

export const FORMAT_LABELS: Record<ColorFormat, string> = {
  rgb: 'RGB',
  hex: 'HEX',
  hsl: 'HSL',
  hwb: 'HWB',
  lab: 'LAB',
  oklch: 'OKLCH',
  cmyk: 'CMYK',
  ycbcr: 'YCbCr',
}

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface HslColor {
  /** 0-360 */
  h: number
  /** 0-100 */
  s: number
  /** 0-100 */
  l: number
}

export interface LightnessSwatch {
  /** 展示用标签，如 `-100%`、`+5%`、`35%` */
  label: string
  rgb: RgbColor
}

export interface FormattedColorEntry {
  format: ColorFormat
  label: string
  value: string
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function normalizeRgb(rgb: RgbColor): RgbColor {
  return {
    r: Math.round(clamp(rgb.r, 0, 255)),
    g: Math.round(clamp(rgb.g, 0, 255)),
    b: Math.round(clamp(rgb.b, 0, 255)),
  }
}

export function rgbToHsl(rgb: RgbColor): HslColor {
  const r = clamp01(rgb.r / 255)
  const g = clamp01(rgb.g / 255)
  const b = clamp01(rgb.b / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  if (delta > 0) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  return { h, s: s * 100, l: l * 100 }
}

export function hslToRgb(hsl: HslColor): RgbColor {
  const h = ((hsl.h % 360) + 360) % 360
  const s = clamp(hsl.s, 0, 100) / 100
  const l = clamp(hsl.l, 0, 100) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

/** 0-255 → 两位十六进制 */
function hexPair(value: number): string {
  return Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, '0')
}

export function rgbToHex(rgb: RgbColor): string {
  const color = normalizeRgb(rgb)
  return `#${hexPair(color.r)}${hexPair(color.g)}${hexPair(color.b)}`.toUpperCase()
}

/** 透明度百分比 → 0-1 的小数文本（去掉多余的 0） */
export function formatAlpha(alpha: number): string {
  return (Math.round(clamp(alpha, 0, 100)) / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function colorCss(rgb: RgbColor, alpha = 100): string {
  const color = normalizeRgb(rgb)
  return Math.round(clamp(alpha, 0, 100)) >= 100
    ? `rgb(${color.r}, ${color.g}, ${color.b})`
    : `rgba(${color.r}, ${color.g}, ${color.b}, ${formatAlpha(alpha)})`
}

export function hslToCss(hsl: HslColor, alpha = 100): string {
  const h = round(((hsl.h % 360) + 360) % 360)
  const s = round(clamp(hsl.s, 0, 100))
  const l = round(clamp(hsl.l, 0, 100))
  return clamp(alpha, 0, 100) >= 100
    ? `hsl(${h} ${s}% ${l}%)`
    : `hsl(${h} ${s}% ${l}% / ${formatAlpha(alpha)})`
}

/** sRGB → 线性 sRGB */
function srgbToLinear(channel: number): number {
  const c = clamp01(channel / 255)
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function rgbToHwb(rgb: RgbColor): { h: number; w: number; b: number } {
  const color = normalizeRgb(rgb)
  const h = rgbToHsl(color).h
  const w = (Math.min(color.r, color.g, color.b) / 255) * 100
  const b = (1 - Math.max(color.r, color.g, color.b) / 255) * 100
  return { h, w, b }
}

export function rgbToLab(rgb: RgbColor): { l: number; a: number; b: number } {
  const r = srgbToLinear(rgb.r)
  const g = srgbToLinear(rgb.g)
  const b = srgbToLinear(rgb.b)

  // sRGB → XYZ（D65）
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b

  const epsilon = 216 / 24389
  const kappa = 24389 / 27
  const f = (t: number) => (t > epsilon ? Math.cbrt(t) : (kappa * t + 16) / 116)

  const fx = f(x / 0.95047)
  const fy = f(y)
  const fz = f(z / 1.08883)

  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

export function rgbToOklch(rgb: RgbColor): { l: number; c: number; h: number } {
  const r = srgbToLinear(rgb.r)
  const g = srgbToLinear(rgb.g)
  const b = srgbToLinear(rgb.b)

  // 线性 sRGB → OKLab
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  const okL = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const okA = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const okB = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_

  const chroma = Math.hypot(okA, okB)
  const hue = ((Math.atan2(okB, okA) * 180) / Math.PI + 360) % 360
  return { l: okL * 100, c: chroma, h: hue }
}

export function rgbToCmyk(rgb: RgbColor): { c: number; m: number; y: number; k: number } {
  const color = normalizeRgb(rgb)
  const r = color.r / 255
  const g = color.g / 255
  const b = color.b / 255
  const k = 1 - Math.max(r, g, b)
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 }
  return {
    c: ((1 - r - k) / (1 - k)) * 100,
    m: ((1 - g - k) / (1 - k)) * 100,
    y: ((1 - b - k) / (1 - k)) * 100,
    k: k * 100,
  }
}

export function rgbToYcbcr(rgb: RgbColor): { y: number; cb: number; cr: number } {
  const color = normalizeRgb(rgb)
  return {
    y: 0.299 * color.r + 0.587 * color.g + 0.114 * color.b,
    cb: 128 - 0.168736 * color.r - 0.331264 * color.g + 0.5 * color.b,
    cr: 128 + 0.5 * color.r - 0.418688 * color.g - 0.081312 * color.b,
  }
}

/**
 * 把颜色格式化为可复制文本。
 * 透明度 = 100 时不带任何透明属性；< 100 时按格式追加透明信息：
 * - `rgb` / `hsl` → `rgba()` / `hsla()`
 * - `hex` → 8 位十六进制
 * - `hwb` / `lab` / `oklch` → CSS 的 `/ a`
 * - `cmyk` / `ycbcr` → 追加 `A: a`
 */
export function formatColor(rgb: RgbColor, alpha: number, format: ColorFormat): string {
  const color = normalizeRgb(rgb)
  const a = Math.round(clamp(alpha, 0, 100))
  const withAlpha = a < 100
  const aText = formatAlpha(a)

  switch (format) {
    case 'rgb':
      return withAlpha
        ? `rgba(${color.r}, ${color.g}, ${color.b}, ${aText})`
        : `rgb(${color.r}, ${color.g}, ${color.b})`

    case 'hex': {
      const hex = rgbToHex(color)
      if (!withAlpha) return hex
      return `${hex}${hexPair((a / 100) * 255)}`
    }

    case 'hsl': {
      const hsl = rgbToHsl(color)
      const h = round(hsl.h) % 360
      const s = round(hsl.s)
      const l = round(hsl.l)
      return withAlpha ? `hsla(${h}, ${s}%, ${l}%, ${aText})` : `hsl(${h}, ${s}%, ${l}%)`
    }

    case 'hwb': {
      const hwb = rgbToHwb(color)
      const h = round(hwb.h) % 360
      const w = round(hwb.w)
      const b = round(hwb.b)
      return withAlpha ? `hwb(${h} ${w}% ${b}% / ${aText})` : `hwb(${h} ${w}% ${b}%)`
    }

    case 'lab': {
      const lab = rgbToLab(color)
      const l = round(lab.l, 2)
      const aAxis = round(lab.a, 2)
      const bAxis = round(lab.b, 2)
      return withAlpha ? `lab(${l}% ${aAxis} ${bAxis} / ${aText})` : `lab(${l}% ${aAxis} ${bAxis})`
    }

    case 'oklch': {
      const oklch = rgbToOklch(color)
      const l = round(oklch.l, 2)
      const c = round(oklch.c, 4)
      const h = round(oklch.h, 2)
      return withAlpha ? `oklch(${l}% ${c} ${h} / ${aText})` : `oklch(${l}% ${c} ${h})`
    }

    case 'cmyk': {
      const cmyk = rgbToCmyk(color)
      const text = `C: ${round(cmyk.c)}, M: ${round(cmyk.m)}, Y: ${round(cmyk.y)}, K: ${round(cmyk.k)}`
      return withAlpha ? `${text}, A: ${aText}` : text
    }

    case 'ycbcr': {
      const ycbcr = rgbToYcbcr(color)
      const text = `Y: ${round(ycbcr.y)}, Cb: ${round(ycbcr.cb)}, Cr: ${round(ycbcr.cr)}`
      return withAlpha ? `${text}, A: ${aText}` : text
    }
  }
}

/** 右侧单位面板 / 配色助手子菜单共用的数据源 */
export function formatColorEntries(rgb: RgbColor, alpha: number): FormattedColorEntry[] {
  return COLOR_FORMATS.map((format) => ({
    format,
    label: FORMAT_LABELS[format],
    value: formatColor(rgb, alpha, format),
  }))
}

/** 「基于亮度信息」色板的偏移档位：±5% ~ ±100%，每 5% 一档（不含 0%） */
function lightnessOffsetSteps(): number[] {
  const offsets: number[] = []
  for (let offset = -100; offset <= -5; offset += 5) offsets.push(offset)
  for (let offset = 5; offset <= 100; offset += 5) offsets.push(offset)
  return offsets
}

/**
 * 通用「基于亮度信息」色板：以当前亮度为基准，按 5%（相对亮度通道的取值范围）一档上下偏移。
 * 亮度会被夹在 [min, max]，因此两端会产生重复值；重复项只保留离当前亮度最近的一条。
 *
 * @param current 当前亮度值（min ~ max，例如 HSL 的 L 0-100、YCbCr 的 Y 0-255）
 * @param min 亮度下限
 * @param max 亮度上限
 * @param toColor 亮度 → sRGB 的转换（其它分量由调用方固定）
 */
export function lightnessSwatchesInRange(
  current: number,
  min: number,
  max: number,
  toColor: (value: number) => RgbColor,
): LightnessSwatch[] {
  const span = max - min
  if (!(span > 0)) return []

  const offsets = lightnessOffsetSteps()
  const valueOf = (offset: number) => clamp(current + (offset / 100) * span, min, max)

  // 同一亮度（夹紧后取整）保留 |offset| 最小的一条，标签最接近真实变化
  const keptByLightness = new Map<number, number>()
  for (const offset of offsets) {
    const lightness = Math.round(valueOf(offset))
    const kept = keptByLightness.get(lightness)
    if (kept === undefined || Math.abs(offset) < Math.abs(kept)) {
      keptByLightness.set(lightness, offset)
    }
  }

  return offsets
    .filter((offset) => keptByLightness.get(Math.round(valueOf(offset))) === offset)
    .map((offset) => ({
      label: `${offset > 0 ? '+' : ''}${offset}%`,
      rgb: toColor(valueOf(offset)),
    }))
}

/**
 * 通用「所有亮度配色信息」色板：忽略当前亮度，固定展示亮度通道取值范围内 5% - 100% 共 20 档。
 */
export function allLightnessSwatchesInRange(
  min: number,
  max: number,
  toColor: (value: number) => RgbColor,
): LightnessSwatch[] {
  const span = max - min
  if (!(span > 0)) return []

  const swatches: LightnessSwatch[] = []
  for (let ratio = 5; ratio <= 100; ratio += 5) {
    swatches.push({ label: `${ratio}%`, rgb: toColor(min + (ratio / 100) * span) })
  }
  return swatches
}

/**
 * 「基于亮度信息」色板：以当前颜色为基准，按 5% 一档上下偏移 HSL 亮度。
 * 亮度会被夹在 0-100，因此两端会产生重复值；重复项只保留离当前亮度最近的一条，其余隐藏。
 */
export function lightnessSwatches(hsl: HslColor): LightnessSwatch[] {
  return lightnessSwatchesInRange(hsl.l, 0, 100, (lightness) =>
    hslToRgb({ h: hsl.h, s: hsl.s, l: lightness }),
  )
}

/** 「所有亮度配色信息」色板：忽略当前亮度，固定 5%-100% */
export function allLightnessSwatches(hsl: HslColor): LightnessSwatch[] {
  return allLightnessSwatchesInRange(0, 100, (lightness) =>
    hslToRgb({ h: hsl.h, s: hsl.s, l: lightness }),
  )
}

/* ------------------------------------------------------------------------------------------
 * 模式空间转换与广色域（TODO「其它取色模式」/ OKLCH 色域可视化）
 *
 * 内部统一用 sRGB 0-255 表示颜色，这里补齐「其它取色模式」的反向转换（模式空间 → sRGB），
 * 以及 OKLCH 的色域判定 / 色域映射 / 色域边界所需的三原色矩阵。
 * 色域判定在线性 RGB 空间做：sRGB ⊂ Display P3 ⊂ REC 2020，只要每个通道都在 [0, 1] 内即可显示。
 * ---------------------------------------------------------------------------------------- */

export type Vec3 = [number, number, number]

export interface HwbColor {
  /** 0-360 */
  h: number
  /** 0-100 */
  w: number
  /** 0-100 */
  b: number
}

export interface LabColor {
  /** 0-100 */
  l: number
  /** 约 -128 ~ 127 */
  a: number
  /** 约 -128 ~ 127 */
  b: number
}

export interface OklchColor {
  /** 0-100 */
  l: number
  /** 0 ~ 约 0.4 */
  c: number
  /** 0-360 */
  h: number
}

export interface CmykColor {
  c: number
  m: number
  y: number
  k: number
}

export interface YcbcrColor {
  /** 0-255 */
  y: number
  /** 0-255，128 为中性 */
  cb: number
  /** 0-255，128 为中性 */
  cr: number
}

/** 目标色域：sRGB（普通显示器）/ Display P3 / REC 2020 */
export type GamutSpace = 'srgb' | 'p3' | 'rec2020'

export interface GamutStatus {
  inSrgb: boolean
  inP3: boolean
  inRec2020: boolean
}

/** 「选择颜色」卡片分裂所需的信息：选中色超出 sRGB 时使用 */
export interface OutOfGamutInfo {
  mode: ColorFormat
  /** 浏览器可解析的原始颜色（如 `oklch(72% 0.35 150)`，含透明度） */
  css: string
  /** 浏览器把该颜色裁剪到 sRGB 后实际显示的颜色 */
  browserRgb: RgbColor
  /** 色域映射（降低彩度）后的回退颜色 */
  fallbackRgb: RgbColor
}

/** sRGB 0-255 → 线性 0-1 */
export function srgbChannelToLinear(channel: number): number {
  const c = clamp01(channel / 255)
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** 线性 0-1 → sRGB 0-255（不夹紧，保留负值 / 超过 255 的值，供色域判定使用） */
export function linearChannelToSrgb(value: number): number {
  const sign = value < 0 ? -1 : 1
  const abs = Math.abs(value)
  const encoded = abs <= 0.0031308 ? abs * 12.92 : 1.055 * abs ** (1 / 2.4) - 0.055
  return sign * encoded * 255
}

export function rgbToLinearSrgb(rgb: RgbColor): Vec3 {
  const color = normalizeRgb(rgb)
  return [srgbChannelToLinear(color.r), srgbChannelToLinear(color.g), srgbChannelToLinear(color.b)]
}

export function linearSrgbToRgb(linear: Vec3): RgbColor {
  return normalizeRgb({
    r: linearChannelToSrgb(linear[0]),
    g: linearChannelToSrgb(linear[1]),
    b: linearChannelToSrgb(linear[2]),
  })
}

/** 线性 sRGB → XYZ（D65） */
const XYZ_D65_FROM_LINEAR_SRGB: readonly [Vec3, Vec3, Vec3] = [
  [0.4123907992659595, 0.357584339383878, 0.1804807884018343],
  [0.2126390058715104, 0.7151686787677561, 0.0721923153607337],
  [0.0193308187155918, 0.119194779794626, 0.9505321522496607],
]

/** XYZ（D65）→ 线性 sRGB */
const LINEAR_SRGB_FROM_XYZ_D65: readonly [Vec3, Vec3, Vec3] = [
  [3.2409699419045226, -1.5373831775700939, -0.4986107602930034],
  [-0.9692436362808796, 1.8759675015077202, 0.0415550574071756],
  [0.0556300796969936, -0.2039769588889765, 1.0569715142428786],
]

/** XYZ（D65）→ 线性 Display P3 */
const LINEAR_P3_FROM_XYZ_D65: readonly [Vec3, Vec3, Vec3] = [
  [2.4934969119414254, -0.9313836179191239, -0.4027107844507168],
  [-0.8294889695615748, 1.7626640603183465, 0.0236246858419436],
  [0.0358458302437845, -0.0761723892680418, 0.9568845240076872],
]

/** XYZ（D65）→ 线性 REC 2020 */
const LINEAR_REC2020_FROM_XYZ_D65: readonly [Vec3, Vec3, Vec3] = [
  [1.7166511879712674, -0.3556707837763925, -0.2533662813736599],
  [-0.6666843518324891, 1.6164812366349395, 0.0157685458139111],
  [0.0176398574453108, -0.0427706132578085, 0.9421031212354739],
]

function multiplyMatrix(matrix: readonly [Vec3, Vec3, Vec3], vector: Vec3): Vec3 {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2],
  ]
}

export function linearSrgbToXyzD65(linear: Vec3): Vec3 {
  return multiplyMatrix(XYZ_D65_FROM_LINEAR_SRGB, linear)
}

export function xyzD65ToLinearSrgb(xyz: Vec3): Vec3 {
  return multiplyMatrix(LINEAR_SRGB_FROM_XYZ_D65, xyz)
}

/** 线性 sRGB → 线性 Display P3（可能是超出 [0, 1] 的值） */
export function linearSrgbToLinearP3(linear: Vec3): Vec3 {
  return multiplyMatrix(LINEAR_P3_FROM_XYZ_D65, linearSrgbToXyzD65(linear))
}

/** 线性 sRGB → 线性 REC 2020（可能是超出 [0, 1] 的值） */
export function linearSrgbToLinearRec2020(linear: Vec3): Vec3 {
  return multiplyMatrix(LINEAR_REC2020_FROM_XYZ_D65, linearSrgbToXyzD65(linear))
}

/** 线性 RGB 是否落在 [0, 1] 内（色域判定；留一点容差抵消往返误差） */
export function inGamutLinear(linear: Vec3, epsilon = 1e-4): boolean {
  return linear.every((channel) => channel >= -epsilon && channel <= 1 + epsilon)
}

/** HWB → sRGB：w + b ≥ 100 时退化为灰色，否则在纯色相上混入白 / 黑 */
export function hwbToRgb(hwb: HwbColor): RgbColor {
  const h = ((hwb.h % 360) + 360) % 360
  const w = clamp(hwb.w, 0, 100) / 100
  const b = clamp(hwb.b, 0, 100) / 100
  if (w + b >= 1) {
    const gray = w / (w + b)
    return normalizeRgb({ r: gray * 255, g: gray * 255, b: gray * 255 })
  }
  const pure = hslToRgb({ h, s: 100, l: 50 })
  const scale = 1 - w - b
  return normalizeRgb({
    r: (pure.r / 255) * scale * 255 + w * 255,
    g: (pure.g / 255) * scale * 255 + w * 255,
    b: (pure.b / 255) * scale * 255 + w * 255,
  })
}

/** LAB（D65）→ 线性 sRGB（可能是超出 [0, 1] 的值） */
export function labToLinearSrgb(lab: LabColor): Vec3 {
  const l = clamp(lab.l, 0, 100)
  const fy = (l + 16) / 116
  const fx = fy + lab.a / 500
  const fz = fy - lab.b / 200

  const epsilon = 216 / 24389
  const kappa = 24389 / 27
  const inverse = (t: number) => (t ** 3 > epsilon ? t ** 3 : (116 * t - 16) / kappa)

  return xyzD65ToLinearSrgb([inverse(fx) * 0.95047, inverse(fy), inverse(fz) * 1.08883])
}

/** LAB → sRGB（越界分量夹紧，用作二维色板 / 滑块的显示色） */
export function labToRgb(lab: LabColor): RgbColor {
  return linearSrgbToRgb(labToLinearSrgb(lab))
}

/**
 * LAB → 可显示 sRGB（保持 L，二分降低 a / b 的强度直到进入 sRGB 色域）。
 * 用于配色助手：亮度 100% 会退回白色、0% 退回黑色，中间档位保留尽量多的色相。
 */
export function gamutMapLabToRgb(lab: LabColor): RgbColor {
  const lightness = clamp(lab.l, 0, 100)
  const linear = labToLinearSrgb({ l: lightness, a: lab.a, b: lab.b })
  if (inGamutLinear(linear)) return linearSrgbToRgb(linear)

  let low = 0
  let high = 1
  let best = linearSrgbToRgb(labToLinearSrgb({ l: lightness, a: 0, b: 0 }))
  for (let step = 0; step < 20; step += 1) {
    const middle = (low + high) / 2
    const candidate = labToLinearSrgb({ l: lightness, a: lab.a * middle, b: lab.b * middle })
    if (inGamutLinear(candidate)) {
      low = middle
      best = linearSrgbToRgb(candidate)
    } else {
      high = middle
    }
  }
  return best
}

/** OKLCH → 线性 sRGB（可能是超出 [0, 1] 的值，超广色域颜色就是靠它判定的） */
export function oklchToLinearSrgb(oklch: OklchColor): Vec3 {
  const lightness = clamp(oklch.l, 0, 100) / 100
  const chroma = Math.max(0, oklch.c)
  const hue = ((oklch.h % 360) + 360) % 360
  const radians = (hue * Math.PI) / 180
  const a = chroma * Math.cos(radians)
  const b = chroma * Math.sin(radians)

  // OKLab → 立方根后的 LMS
  const lCube = lightness + 0.3963377774 * a + 0.2158037573 * b
  const mCube = lightness - 0.1055613458 * a - 0.0638541728 * b
  const sCube = lightness - 0.0894841775 * a - 1.291485548 * b
  const l = lCube ** 3
  const m = mCube ** 3
  const s = sCube ** 3

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

/** OKLCH → sRGB：越界时逐通道裁剪（约等于浏览器在 sRGB 屏幕上的实际显示） */
export function oklchToRgb(oklch: OklchColor): RgbColor {
  return linearSrgbToRgb(oklchToLinearSrgb(oklch))
}

/** 同时判断 OKLCH 颜色能否在 sRGB / Display P3 / REC 2020 中显示 */
export function oklchGamutStatus(oklch: OklchColor): GamutStatus {
  const linear = oklchToLinearSrgb(oklch)
  const inSrgb = inGamutLinear(linear)
  if (!inSrgb) {
    return {
      inSrgb,
      inP3: inGamutLinear(linearSrgbToLinearP3(linear)),
      inRec2020: inGamutLinear(linearSrgbToLinearRec2020(linear)),
    }
  }
  // sRGB ⊂ P3 ⊂ REC 2020：能显示 sRGB 就一定也能显示后两者
  return { inSrgb, inP3: true, inRec2020: true }
}

/**
 * 色域映射回退色：CSS Color 4 的做法——保持 L / H，二分降低彩度直到进入 sRGB 色域。
 * 比逐通道裁剪更接近原色（不会明显偏色），用于「可显示的回退颜色」卡片。
 */
export function gamutMapOklchToRgb(oklch: OklchColor): RgbColor {
  const lightness = clamp(oklch.l, 0, 100)
  const hue = ((oklch.h % 360) + 360) % 360
  const chroma = Math.max(0, oklch.c)
  const linear = oklchToLinearSrgb({ l: lightness, c: chroma, h: hue })
  if (inGamutLinear(linear)) return linearSrgbToRgb(linear)

  let low = 0
  let high = chroma
  let best = linearSrgbToRgb(oklchToLinearSrgb({ l: lightness, c: 0, h: hue }))
  for (let step = 0; step < 20; step += 1) {
    const middle = (low + high) / 2
    const candidate = oklchToLinearSrgb({ l: lightness, c: middle, h: hue })
    if (inGamutLinear(candidate)) {
      low = middle
      best = linearSrgbToRgb(candidate)
    } else {
      high = middle
    }
  }
  return best
}

/** OKLCH → CSS 字符串（浏览器可解析；超出 sRGB 时由浏览器裁剪显示） */
export function oklchToCss(oklch: OklchColor, alpha = 100): string {
  const lightness = round(clamp(oklch.l, 0, 100), 2)
  const chroma = round(Math.max(0, oklch.c), 4)
  const hue = round(((oklch.h % 360) + 360) % 360, 2)
  const a = Math.round(clamp(alpha, 0, 100))
  return a >= 100
    ? `oklch(${lightness}% ${chroma} ${hue})`
    : `oklch(${lightness}% ${chroma} ${hue} / ${formatAlpha(a)})`
}

/** CMYK → sRGB */
export function cmykToRgb(cmyk: CmykColor): RgbColor {
  const c = clamp(cmyk.c, 0, 100) / 100
  const m = clamp(cmyk.m, 0, 100) / 100
  const y = clamp(cmyk.y, 0, 100) / 100
  const k = clamp(cmyk.k, 0, 100) / 100
  return normalizeRgb({
    r: 255 * (1 - c) * (1 - k),
    g: 255 * (1 - m) * (1 - k),
    b: 255 * (1 - y) * (1 - k),
  })
}

/** YCbCr（BT.601，Cb / Cr 以 128 为中性）→ sRGB */
export function ycbcrToRgb(ycbcr: YcbcrColor): RgbColor {
  const luma = clamp(ycbcr.y, 0, 255)
  const cb = clamp(ycbcr.cb, 0, 255) - 128
  const cr = clamp(ycbcr.cr, 0, 255) - 128
  return normalizeRgb({
    r: luma + 1.402 * cr,
    g: luma - 0.344136 * cb - 0.714136 * cr,
    b: luma + 1.772 * cb,
  })
}

/**
 * YCbCr → 可显示 sRGB（保持 Y，二分降低 Cb / Cr 偏离中性的幅度直到不需要通道裁剪）。
 * 用于配色助手：亮度 100% 会退回白色、0% 退回黑色，中间档位保留尽量多的色相。
 */
export function gamutMapYcbcrToRgb(ycbcr: YcbcrColor): RgbColor {
  const luma = clamp(ycbcr.y, 0, 255)
  const cbOffset = clamp(ycbcr.cb, 0, 255) - 128
  const crOffset = clamp(ycbcr.cr, 0, 255) - 128

  // 不做通道裁剪（留半级余量，避免四舍五入到 256 / -1）
  const inGamut = (scale: number): boolean => {
    const red = luma + 1.402 * crOffset * scale
    const green = luma - 0.344136 * cbOffset * scale - 0.714136 * crOffset * scale
    const blue = luma + 1.772 * cbOffset * scale
    return [red, green, blue].every((channel) => channel >= -0.5 && channel <= 255.5)
  }

  if (inGamut(1)) {
    return normalizeRgb({
      r: luma + 1.402 * crOffset,
      g: luma - 0.344136 * cbOffset - 0.714136 * crOffset,
      b: luma + 1.772 * cbOffset,
    })
  }

  let low = 0
  let high = 1
  let best = normalizeRgb({ r: luma, g: luma, b: luma })
  for (let step = 0; step < 20; step += 1) {
    const middle = (low + high) / 2
    if (inGamut(middle)) {
      low = middle
      best = normalizeRgb({
        r: luma + 1.402 * crOffset * middle,
        g: luma - 0.344136 * cbOffset * middle - 0.714136 * crOffset * middle,
        b: luma + 1.772 * cbOffset * middle,
      })
    } else {
      high = middle
    }
  }
  return best
}
