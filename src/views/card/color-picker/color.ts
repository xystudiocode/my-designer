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

function rgbToHwb(rgb: RgbColor): { h: number; w: number; b: number } {
  const color = normalizeRgb(rgb)
  const h = rgbToHsl(color).h
  const w = (Math.min(color.r, color.g, color.b) / 255) * 100
  const b = (1 - Math.max(color.r, color.g, color.b) / 255) * 100
  return { h, w, b }
}

function rgbToLab(rgb: RgbColor): { l: number; a: number; b: number } {
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

function rgbToOklch(rgb: RgbColor): { l: number; c: number; h: number } {
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

function rgbToCmyk(rgb: RgbColor): { c: number; m: number; y: number; k: number } {
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

function rgbToYcbcr(rgb: RgbColor): { y: number; cb: number; cr: number } {
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

/**
 * 「基于亮度信息」色板：以当前颜色为基准，按 5% 一档上下偏移 HSL 亮度。
 * 亮度会被夹在 0-100，因此两端会产生重复值；重复项只保留离当前亮度最近的一条，其余隐藏。
 */
export function lightnessSwatches(hsl: HslColor): LightnessSwatch[] {
  const offsets: number[] = []
  for (let offset = -100; offset <= -5; offset += 5) offsets.push(offset)
  for (let offset = 5; offset <= 100; offset += 5) offsets.push(offset)

  // 同一亮度（夹紧到 0/100 后）保留 |offset| 最小的一条，标签最接近真实变化
  const keptByLightness = new Map<number, number>()
  for (const offset of offsets) {
    const lightness = round(clamp(hsl.l + offset, 0, 100))
    const kept = keptByLightness.get(lightness)
    if (kept === undefined || Math.abs(offset) < Math.abs(kept)) {
      keptByLightness.set(lightness, offset)
    }
  }

  return offsets
    .filter((offset) => keptByLightness.get(round(clamp(hsl.l + offset, 0, 100))) === offset)
    .map((offset) => ({
      label: `${offset > 0 ? '+' : ''}${offset}%`,
      rgb: hslToRgb({ h: hsl.h, s: hsl.s, l: clamp(hsl.l + offset, 0, 100) }),
    }))
}

/** 「所有亮度配色信息」色板：忽略当前亮度，固定 5%-100% */
export function allLightnessSwatches(hsl: HslColor): LightnessSwatch[] {
  const swatches: LightnessSwatch[] = []
  for (let lightness = 5; lightness <= 100; lightness += 5) {
    swatches.push({
      label: `${lightness}%`,
      rgb: hslToRgb({ h: hsl.h, s: hsl.s, l: lightness }),
    })
  }
  return swatches
}
