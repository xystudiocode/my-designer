import { describe, expect, it } from 'vitest'
import {
  COLOR_FORMATS,
  allLightnessSwatches,
  colorCss,
  formatAlpha,
  formatColor,
  formatColorEntries,
  hslToRgb,
  lightnessSwatches,
  rgbToHex,
  rgbToHsl,
  type RgbColor,
} from '../color'

const BLUE: RgbColor = { r: 59, g: 130, b: 246 }

describe('rgbToHsl / hslToRgb', () => {
  it('纯色与灰度的 HSL 值正确', () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 })
    expect(rgbToHsl({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, l: 50 })
    expect(rgbToHsl({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, l: 50 })
    expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 })
    expect(rgbToHsl({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, l: 0 })
  })

  it('RGB → HSL → RGB 往返误差不超过 1', () => {
    const samples: RgbColor[] = [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
      { r: 59, g: 130, b: 246 },
      { r: 12, g: 200, b: 87 },
      { r: 240, g: 90, b: 8 },
      { r: 128, g: 128, b: 128 },
    ]
    for (const sample of samples) {
      const roundTrip = hslToRgb(rgbToHsl(sample))
      expect(Math.abs(roundTrip.r - sample.r)).toBeLessThanOrEqual(1)
      expect(Math.abs(roundTrip.g - sample.g)).toBeLessThanOrEqual(1)
      expect(Math.abs(roundTrip.b - sample.b)).toBeLessThanOrEqual(1)
    }
  })
})

describe('formatAlpha', () => {
  it('把 0-100 的透明度转成去掉多余 0 的 0-1 文本', () => {
    expect(formatAlpha(100)).toBe('1')
    expect(formatAlpha(99.6)).toBe('1')
    expect(formatAlpha(50)).toBe('0.5')
    expect(formatAlpha(85)).toBe('0.85')
    expect(formatAlpha(33)).toBe('0.33')
    expect(formatAlpha(5)).toBe('0.05')
    expect(formatAlpha(0)).toBe('0')
  })
})

describe('formatColor', () => {
  it('alpha = 100 时所有格式都不带透明属性', () => {
    for (const format of COLOR_FORMATS) {
      const text = formatColor(BLUE, 100, format)
      expect(text).not.toContain('rgba')
      expect(text).not.toContain('hsla')
      expect(text).not.toContain(' / ')
      expect(text).not.toContain(', A:')
      // 8 位 hex 会以 2 位透明度结尾，这里应当是 7 个字符的 6 位 hex
      if (format === 'hex') expect(text).toHaveLength(7)
    }
  })

  it('非整数透明度先取整：99.6 按 100 处理，不产生 8 位 hex', () => {
    expect(formatColor(BLUE, 99.6, 'hex')).toHaveLength(7)
    expect(formatColor(BLUE, 99.6, 'rgb')).toBe('rgb(59, 130, 246)')
  })

  it('rgb / hex / hsl 的格式化与透明度处理', () => {
    expect(formatColor(BLUE, 100, 'rgb')).toBe('rgb(59, 130, 246)')
    expect(formatColor(BLUE, 50, 'rgb')).toBe('rgba(59, 130, 246, 0.5)')
    expect(formatColor(BLUE, 100, 'hex')).toBe('#3B82F6')
    expect(formatColor(BLUE, 50, 'hex')).toBe('#3B82F680')
    expect(formatColor(BLUE, 100, 'hsl')).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/)
    expect(formatColor(BLUE, 50, 'hsl')).toMatch(/^hsla\(\d+, \d+%, \d+%, 0\.5\)$/)
  })

  it('其余格式语法正确，且透明度 < 100 时追加透明信息', () => {
    expect(formatColor(BLUE, 100, 'hwb')).toMatch(/^hwb\(\d+ \d+% \d+%\)$/)
    expect(formatColor(BLUE, 50, 'hwb')).toMatch(/^hwb\(\d+ \d+% \d+% \/ 0\.5\)$/)

    expect(formatColor(BLUE, 100, 'lab')).toMatch(/^lab\([\d.]+% -?[\d.]+ -?[\d.]+\)$/)
    expect(formatColor(BLUE, 50, 'lab')).toContain(' / 0.5)')

    expect(formatColor(BLUE, 100, 'oklch')).toMatch(/^oklch\([\d.]+% [\d.]+ [\d.]+\)$/)
    expect(formatColor(BLUE, 50, 'oklch')).toContain(' / 0.5)')

    const cmyk = formatColor(BLUE, 100, 'cmyk')
    expect(cmyk).toMatch(/^C: \d+, M: \d+, Y: \d+, K: \d+$/)
    expect(formatColor(BLUE, 50, 'cmyk')).toBe(`${cmyk}, A: 0.5`)

    const ycbcr = formatColor(BLUE, 100, 'ycbcr')
    expect(ycbcr).toMatch(/^Y: \d+, Cb: \d+, Cr: \d+$/)
    expect(formatColor(BLUE, 50, 'ycbcr')).toBe(`${ycbcr}, A: 0.5`)
  })
})

describe('rgbToHex / colorCss', () => {
  it('hex 补零并大写，colorCss 按透明度切换 rgb/rgba', () => {
    expect(rgbToHex({ r: 0, g: 10, b: 255 })).toBe('#000AFF')
    expect(colorCss(BLUE, 100)).toBe('rgb(59, 130, 246)')
    expect(colorCss(BLUE, 50)).toBe('rgba(59, 130, 246, 0.5)')
  })
})

describe('formatColorEntries', () => {
  it('按固定顺序返回 8 种格式', () => {
    const entries = formatColorEntries(BLUE, 100)
    expect(entries).toHaveLength(8)
    expect(entries.map((entry) => entry.format)).toEqual([...COLOR_FORMATS])
    for (const entry of entries) expect(entry.value).not.toBe('')
  })
})

describe('lightnessSwatches', () => {
  it('按 5% 一档生成 ±100% 的亮度偏移色板', () => {
    const swatches = lightnessSwatches({ h: 210, s: 80, l: 50 })
    expect(swatches).toHaveLength(20)
    expect(swatches[0]?.label).toBe('-50%')
    expect(swatches[swatches.length - 1]?.label).toBe('+50%')
  })

  it('亮度夹紧到 0/100 后重复的色板只保留一条', () => {
    const dark = lightnessSwatches({ h: 0, s: 100, l: 0 })
    expect(dark).toHaveLength(21)
    expect(dark[0]?.label).toBe('-5%')

    const light = lightnessSwatches({ h: 0, s: 100, l: 100 })
    expect(light).toHaveLength(21)
    expect(light[light.length - 1]?.label).toBe('+5%')
  })

  it('每个色块颜色 = 当前 HSL 亮度加上标签偏移（再夹紧）', () => {
    const hsl = { h: 30, s: 60, l: 40 }
    for (const swatch of lightnessSwatches(hsl)) {
      const offset = Number(swatch.label.replace('%', ''))
      const lightness = Math.min(100, Math.max(0, hsl.l + offset))
      expect(swatch.rgb).toEqual(hslToRgb({ h: hsl.h, s: hsl.s, l: lightness }))
    }
  })
})

describe('allLightnessSwatches', () => {
  it('忽略当前亮度，固定输出 5%-100% 共 20 条', () => {
    const swatches = allLightnessSwatches({ h: 280, s: 50, l: 12 })
    expect(swatches).toHaveLength(20)
    expect(swatches[0]?.label).toBe('5%')
    expect(swatches[swatches.length - 1]?.label).toBe('100%')
    for (const swatch of swatches) {
      const lightness = Number(swatch.label.replace('%', ''))
      expect(swatch.rgb).toEqual(hslToRgb({ h: 280, s: 50, l: lightness }))
    }
  })
})
