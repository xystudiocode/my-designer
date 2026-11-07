import { describe, expect, it } from 'vitest'
import {
  COLOR_MODES,
  allLightnessSwatches,
  gamutMapLabToRgb,
  gamutMapYcbcrToRgb,
  hslToRgb,
  lightnessSwatches,
  normalizeRgb,
  oklchGamutStatus,
  rgbToHsl,
  rgbToLab,
  rgbToOklch,
  rgbToYcbcr,
  type ColorFormat,
  type OklchColor,
  type RgbColor,
} from '../color'
import { defaultAxisSettings } from '../pickerState'
import {
  assistantLightnessPalettes,
  channelDefinition,
  clampChannel,
  createPanelSampler,
  defaultAxisSetting,
  formatChannelValue,
  modeDefinition,
  normalizeModeValues,
  sanitizeAxisSetting,
  type ModeChannelDef,
  type PanelSample,
} from '../modes'

const PANEL_FIRST_MODES: readonly ColorFormat[] = ['hsl', 'hwb', 'lab', 'oklch', 'ycbcr']

const SAMPLE_COLORS: readonly RgbColor[] = [
  { r: 0, g: 0, b: 0 },
  { r: 255, g: 255, b: 255 },
  { r: 59, g: 130, b: 246 },
  { r: 12, g: 200, b: 87 },
  { r: 240, g: 90, b: 8 },
  { r: 128, g: 128, b: 128 },
  { r: 255, g: 0, b: 0 },
  { r: 0, g: 0, b: 255 },
  { r: 7, g: 3, b: 91 },
]

function channelOf(mode: ColorFormat, key: string): ModeChannelDef {
  const channel = channelDefinition(mode, key)
  expect(channel, `${mode} 缺少分量 ${key}`).toBeDefined()
  return channel as ModeChannelDef
}

describe('MODE_DEFINITIONS / modeDefinition', () => {
  it('7 个取色模式都有定义与完整的分量顺序', () => {
    expect(COLOR_MODES).toHaveLength(7)

    for (const mode of COLOR_MODES) {
      const definition = modeDefinition(mode)
      expect(definition.mode).toBe(mode)
      expect(definition.channels.length).toBeGreaterThanOrEqual(3)
      // 默认坐标轴必须在自己的分量里
      const keys = definition.channels.map((channel) => channel.key)
      expect(keys).toContain(definition.defaultSlider)
      expect(keys).toContain(definition.defaultX)
      expect(keys).toContain(definition.defaultY)
    }

    expect(modeDefinition('rgb').channels.map((channel) => channel.key)).toEqual(['r', 'g', 'b'])
    expect(modeDefinition('cmyk').channels.map((channel) => channel.key)).toEqual([
      'c',
      'm',
      'y',
      'k',
    ])
    expect(modeDefinition('hsl').channels.map((channel) => channel.key)).toEqual(['h', 's', 'l'])
    expect(modeDefinition('hwb').channels.map((channel) => channel.key)).toEqual(['h', 'w', 'b'])
    expect(modeDefinition('lab').channels.map((channel) => channel.key)).toEqual(['l', 'a', 'b'])
    expect(modeDefinition('oklch').channels.map((channel) => channel.key)).toEqual(['l', 'c', 'h'])
    expect(modeDefinition('ycbcr').channels.map((channel) => channel.key)).toEqual([
      'y',
      'cb',
      'cr',
    ])
  })

  it('布局：RGB / CMYK 滑块在上，其余模式二维图在上；只有 OKLCH 画色域线', () => {
    expect(modeDefinition('rgb').layout).toBe('sliders-first')
    expect(modeDefinition('cmyk').layout).toBe('sliders-first')
    for (const mode of PANEL_FIRST_MODES) {
      expect(modeDefinition(mode).layout).toBe('panel-first')
    }

    expect(modeDefinition('oklch').showGamutLines).toBe(true)
    for (const mode of COLOR_MODES) {
      if (mode === 'oklch') continue
      expect(modeDefinition(mode).showGamutLines).toBeUndefined()
    }
  })

  it('分量范围与手动输入精度符合 DESIGN', () => {
    expect(channelOf('rgb', 'r')).toMatchObject({ min: 0, max: 255 })
    expect(channelOf('cmyk', 'k')).toMatchObject({ min: 0, max: 100 })

    expect(channelOf('hsl', 'h')).toMatchObject({ min: 0, max: 360 })
    expect(channelOf('hwb', 'w')).toMatchObject({ min: 0, max: 100 })

    const labA = channelOf('lab', 'a')
    expect(labA.min).toBe(-128)
    expect(labA.max).toBe(127)
    expect(labA.digits).toBe(1)

    const oklchL = channelOf('oklch', 'l')
    expect(oklchL).toMatchObject({ min: 0, max: 100, digits: 1, step: 0.1 })
    const oklchC = channelOf('oklch', 'c')
    expect(oklchC).toMatchObject({ min: 0, max: 0.4, digits: 3, step: 0.001 })
    expect(channelOf('oklch', 'h')).toMatchObject({ min: 0, max: 360 })

    // 除 OKLCH 外，其它模式 step 默认 1
    expect(channelOf('hsl', 's').step).toBeUndefined()
  })

  it('defaultAxisSetting 与 pickerState 的默认值一致', () => {
    const defaults = defaultAxisSettings()
    for (const mode of COLOR_MODES) {
      expect(defaultAxisSetting(mode)).toEqual(defaults[mode])
    }
    expect(defaultAxisSetting('hsl')).toEqual({ slider: 'h', x: 's', y: 'l' })
    expect(defaultAxisSetting('hwb')).toEqual({ slider: 'h', x: 'w', y: 'b' })
    expect(defaultAxisSetting('lab')).toEqual({ slider: 'l', x: 'a', y: 'b' })
    expect(defaultAxisSetting('oklch')).toEqual({ slider: 'h', x: 'c', y: 'l' })
    expect(defaultAxisSetting('ycbcr')).toEqual({ slider: 'y', x: 'cb', y: 'cr' })
  })
})

describe('fromRgb / toRgb 往返', () => {
  // 容差：浮点转换 + 8 位取整带来的误差
  const TOLERANCE: Record<string, number> = {
    rgb: 0,
    cmyk: 1,
    hsl: 1,
    hwb: 1,
    lab: 1,
    oklch: 2,
    ycbcr: 2,
  }

  for (const mode of COLOR_MODES) {
    it(`${mode}：往返误差不超过 ${TOLERANCE[mode]}`, () => {
      const definition = modeDefinition(mode)
      for (const sample of SAMPLE_COLORS) {
        const values = normalizeModeValues(mode, definition.fromRgb(sample))
        const roundTrip = normalizeRgb(definition.toRgb(values))
        expect(
          Math.abs(roundTrip.r - sample.r),
          `${mode} R ${JSON.stringify(sample)}`,
        ).toBeLessThanOrEqual(TOLERANCE[mode]!)
        expect(
          Math.abs(roundTrip.g - sample.g),
          `${mode} G ${JSON.stringify(sample)}`,
        ).toBeLessThanOrEqual(TOLERANCE[mode]!)
        expect(
          Math.abs(roundTrip.b - sample.b),
          `${mode} B ${JSON.stringify(sample)}`,
        ).toBeLessThanOrEqual(TOLERANCE[mode]!)
      }
    })
  }

  it('HSL 的 sample 与 toRgb 一致（面板 / 滑块 / 手动输入同源）', () => {
    const definition = modeDefinition('hsl')
    const values = { h: 0, s: 100, l: 50 }
    expect(definition.toRgb(values)).toEqual(hslToRgb({ h: 0, s: 100, l: 50 }))
    expect(definition.sample(values)).toEqual(hslToRgb({ h: 0, s: 100, l: 50 }))
  })
})

describe('normalizeModeValues / clampChannel / formatChannelValue', () => {
  it('normalizeModeValues 补齐缺失分量、夹紧范围、色相按 360° 环绕', () => {
    expect(normalizeModeValues('rgb', { r: -10, g: 300, b: 12.4 })).toEqual({
      r: 0,
      g: 255,
      b: 12.4,
    })
    // 缺失分量回退 min
    expect(normalizeModeValues('rgb', {})).toEqual({ r: 0, g: 0, b: 0 })

    expect(normalizeModeValues('hsl', { h: 370, s: -5, l: 120 })).toEqual({
      h: 10,
      s: 0,
      l: 100,
    })
    expect(normalizeModeValues('hsl', { h: -10, s: 50, l: 50 })).toEqual({
      h: 350,
      s: 50,
      l: 50,
    })
    expect(normalizeModeValues('oklch', { l: 200, c: 1, h: 400 })).toEqual({
      l: 100,
      c: 0.4,
      h: 40,
    })
    expect(normalizeModeValues('lab', { l: 50, a: -999, b: 999 })).toEqual({
      l: 50,
      a: -128,
      b: 127,
    })
  })

  it('clampChannel 夹紧 / 非数字回退 min', () => {
    expect(clampChannel(channelOf('rgb', 'r'), 300)).toBe(255)
    expect(clampChannel(channelOf('rgb', 'r'), -1)).toBe(0)
    expect(clampChannel(channelOf('lab', 'a'), -200)).toBe(-128)
    expect(clampChannel(channelOf('oklch', 'c'), 0.9)).toBe(0.4)
    expect(clampChannel(channelOf('oklch', 'c'), Number.NaN)).toBe(0)
  })

  it('formatChannelValue 按 digits 四舍五入、不带单位', () => {
    expect(formatChannelValue(channelOf('rgb', 'r'), 127.6)).toBe('128')
    expect(formatChannelValue(channelOf('lab', 'a'), -12.34)).toBe('-12.3')
    expect(formatChannelValue(channelOf('lab', 'a'), 0.04)).toBe('0')
    expect(formatChannelValue(channelOf('oklch', 'l'), 72.3456)).toBe('72.3')
    expect(formatChannelValue(channelOf('oklch', 'c'), 0.1502)).toBe('0.15')
    expect(formatChannelValue(channelOf('oklch', 'c'), 0.1234)).toBe('0.123')
    // 展示时先夹紧
    expect(formatChannelValue(channelOf('hsl', 'h'), 400)).toBe('360')
  })
})

describe('sanitizeAxisSetting', () => {
  const hslDefault = { slider: 'h', x: 's', y: 'l' }

  it('合法设置原样返回', () => {
    expect(sanitizeAxisSetting('hsl', { slider: 's', x: 'h', y: 'l' })).toEqual({
      slider: 's',
      x: 'h',
      y: 'l',
    })
  })

  it('非法值（缺失 / 重复 / 不属于该模式）回退默认设置', () => {
    expect(sanitizeAxisSetting('hsl', null)).toEqual(hslDefault)
    expect(sanitizeAxisSetting('hsl', 'bad')).toEqual(hslDefault)
    expect(sanitizeAxisSetting('hsl', {})).toEqual(hslDefault)
    expect(sanitizeAxisSetting('hsl', { slider: 'h', x: 'h', y: 'l' })).toEqual(hslDefault)
    // c 是 OKLCH 的分量，不属于 HSL
    expect(sanitizeAxisSetting('hsl', { slider: 'h', x: 'c', y: 'l' })).toEqual(hslDefault)
    expect(sanitizeAxisSetting('hsl', { slider: 'h', x: 1, y: 'l' })).toEqual(hslDefault)
  })

  it('RGB / CMYK 也返回三分量互不相同的默认值', () => {
    expect(sanitizeAxisSetting('rgb', {})).toEqual({ slider: 'r', x: 'g', y: 'b' })
    expect(sanitizeAxisSetting('cmyk', {})).toEqual({ slider: 'c', x: 'm', y: 'y' })
  })
})

describe('sliderBase（滑块轨道其它分量的基准值）', () => {
  const hsl = { h: 123, s: 45, l: 67 }

  it('RGB / CMYK 其它分量取当前值', () => {
    const rgbBase = modeDefinition('rgb').sliderBase('r', { r: 10, g: 20, b: 30 })
    expect(rgbBase.g).toBe(20)
    expect(rgbBase.b).toBe(30)
    const cmykBase = modeDefinition('cmyk').sliderBase('c', { c: 10, m: 20, y: 30, k: 40 })
    expect(cmykBase.m).toBe(20)
    expect(cmykBase.y).toBe(30)
    expect(cmykBase.k).toBe(40)
  })

  it('HSL：h 用 s=100 / l=50，s 用 h=0 / l=50，l 用 h=0 / s=0', () => {
    const hslDefinition = modeDefinition('hsl')
    expect(hslDefinition.sliderBase('h', hsl)).toMatchObject({ s: 100, l: 50 })
    expect(hslDefinition.sliderBase('s', hsl)).toMatchObject({ h: 0, l: 50 })
    expect(hslDefinition.sliderBase('l', hsl)).toMatchObject({ h: 0, s: 0 })
  })

  it('HWB / LAB / OKLCH / YCbCr 的基准值', () => {
    expect(modeDefinition('hwb').sliderBase('h', { h: 1, w: 2, b: 3 })).toMatchObject({
      w: 0,
      b: 0,
    })
    expect(modeDefinition('hwb').sliderBase('w', { h: 1, w: 2, b: 3 })).toMatchObject({
      h: 0,
      b: 0,
    })
    expect(modeDefinition('hwb').sliderBase('b', { h: 1, w: 2, b: 3 })).toMatchObject({
      h: 0,
      w: 0,
    })

    expect(modeDefinition('lab').sliderBase('l', { l: 50, a: 10, b: 20 })).toMatchObject({
      a: 0,
      b: 0,
    })
    expect(modeDefinition('lab').sliderBase('a', { l: 50, a: 10, b: 20 })).toMatchObject({
      l: 50,
      b: 0,
    })
    expect(modeDefinition('lab').sliderBase('b', { l: 50, a: 10, b: 20 })).toMatchObject({
      l: 50,
      a: 0,
    })

    expect(modeDefinition('oklch').sliderBase('l', { l: 70, c: 0.2, h: 120 })).toMatchObject({
      c: 0,
      h: 0,
    })
    expect(modeDefinition('oklch').sliderBase('c', { l: 70, c: 0.2, h: 120 })).toMatchObject({
      l: 60,
      h: 0,
    })
    expect(modeDefinition('oklch').sliderBase('h', { l: 70, c: 0.2, h: 120 })).toMatchObject({
      l: 60,
      c: 0.12,
    })

    expect(modeDefinition('ycbcr').sliderBase('y', { y: 10, cb: 20, cr: 30 })).toMatchObject({
      cb: 128,
      cr: 128,
    })
    expect(modeDefinition('ycbcr').sliderBase('cb', { y: 10, cb: 20, cr: 30 })).toMatchObject({
      y: 128,
      cr: 128,
    })
    expect(modeDefinition('ycbcr').sliderBase('cr', { y: 10, cb: 20, cr: 30 })).toMatchObject({
      y: 128,
      cb: 128,
    })
  })
})

describe('OKLCH 色域判定 / 回退 / 面板白色', () => {
  // 三档候选：sRGB 内、仅 P3 内、仅 REC2020 内、全部超出（数值由 color.ts 的色域数学验证过）
  const IN_SRGB: OklchColor = { l: 60, c: 0.05, h: 30 }
  const P3_ONLY: OklchColor = { l: 40, c: 0.13, h: 140 }
  const REC2020_ONLY: OklchColor = { l: 60, c: 0.3, h: 150 }
  const OUT_OF_ALL: OklchColor = { l: 60, c: 0.4, h: 150 }

  function asValues(oklch: OklchColor): Record<string, number> {
    return { l: oklch.l, c: oklch.c, h: oklch.h }
  }

  it('oklchGamutStatus 判定色域层级', () => {
    expect(oklchGamutStatus(IN_SRGB)).toEqual({ inSrgb: true, inP3: true, inRec2020: true })

    const p3 = oklchGamutStatus(P3_ONLY)
    expect(p3.inSrgb).toBe(false)
    expect(p3.inP3).toBe(true)
    expect(p3.inRec2020).toBe(true)

    const rec2020 = oklchGamutStatus(REC2020_ONLY)
    expect(rec2020.inSrgb).toBe(false)
    expect(rec2020.inP3).toBe(false)
    expect(rec2020.inRec2020).toBe(true)

    expect(oklchGamutStatus(OUT_OF_ALL)).toEqual({
      inSrgb: false,
      inP3: false,
      inRec2020: false,
    })
  })

  it('sample：sRGB 内返回颜色，超出 sRGB 返回 null（二维色板画白色）', () => {
    const definition = modeDefinition('oklch')
    expect(definition.sample(asValues(IN_SRGB))).not.toBeNull()
    expect(definition.sample(asValues(P3_ONLY))).toBeNull()
    expect(definition.sample(asValues(REC2020_ONLY))).toBeNull()
    expect(definition.sample(asValues(OUT_OF_ALL))).toBeNull()
  })

  it('toRgb 永远可显示；超出 sRGB 时等于色域映射后的回退色', () => {
    const definition = modeDefinition('oklch')
    expect(definition.toRgb(asValues(IN_SRGB))).toEqual(
      normalizeRgb(definition.toRgb(asValues(IN_SRGB))),
    )

    for (const oklch of [P3_ONLY, REC2020_ONLY, OUT_OF_ALL]) {
      const info = definition.outOfGamut?.(asValues(oklch), 100) ?? null
      expect(info).not.toBeNull()
      expect(definition.toRgb(asValues(oklch))).toEqual(info!.fallbackRgb)
    }
  })

  it('outOfGamut 返回浏览器可解析的 css / 裁剪色 / 色域映射回退色', () => {
    const definition = modeDefinition('oklch')
    expect(definition.outOfGamut?.(asValues(IN_SRGB), 100)).toBeNull()

    const info = definition.outOfGamut?.(asValues(P3_ONLY), 80) ?? null
    expect(info).not.toBeNull()
    expect(info!.mode).toBe('oklch')
    expect(info!.css).toBe('oklch(40% 0.13 140 / 0.8)')
    expect(info!.fallbackRgb).toEqual({ r: 22, g: 87, b: 0 })
    expect(info!.browserRgb).toEqual({ r: 21, g: 87, b: 0 })
    // 回退色一定在 sRGB 内
    expect(oklchGamutStatus(rgbToOklch(info!.fallbackRgb)).inSrgb).toBe(true)

    const noAlpha = definition.outOfGamut?.(asValues(P3_ONLY), 100) ?? null
    expect(noAlpha!.css).toBe('oklch(40% 0.13 140)')
  })

  it('其它模式没有 outOfGamut（恒为 null）', () => {
    for (const mode of COLOR_MODES) {
      if (mode === 'oklch') continue
      expect(modeDefinition(mode).outOfGamut).toBeUndefined()
    }
  })
})

describe('createPanelSampler（二维色板逐像素采样）', () => {
  function createSample(): PanelSample {
    return { rgb: -1, inSrgb: false, inP3: false, inRec2020: false }
  }

  it('HSL：x=s / y=l，上 100 下 0，比例映射正确', () => {
    const sampler = createPanelSampler('hsl', { h: 0, s: 50, l: 50 }, 's', 'l')
    const sample = createSample()

    sampler(1, 0.5, sample)
    expect(sample.rgb).toBe(0xff0000)
    expect(sample.inSrgb).toBe(true)

    sampler(0, 0.5, sample)
    expect(sample.rgb).toBe(0x808080)

    sampler(1, 0, sample)
    expect(sample.rgb).toBe(0xffffff)

    sampler(1, 1, sample)
    expect(sample.rgb).toBe(0x000000)
  })

  it('LAB：y 轴正值朝上，负值朝下', () => {
    const sampler = createPanelSampler('lab', { l: 50, a: 0, b: 0 }, 'a', 'b')
    const sample = createSample()
    // 横轴 a 左 -128 → 右 127；纵轴 b 上 127 → 下 -128
    sampler(0, 0.5, sample)
    const left = sample.rgb
    sampler(1, 0.5, sample)
    const right = sample.rgb
    expect(left).not.toBe(right)
  })

  it('OKLCH：x=c / y=l / 滑块 h，超出 sRGB 的像素 rgb = -1（画白）并给出色域标记', () => {
    const sampler = createPanelSampler('oklch', { l: 60, c: 0, h: 150 }, 'c', 'l')
    const sample = createSample()

    // 横轴右端 c=0.4、纵轴中部 l=60：超出所有色域 → 白色
    sampler(1, 0.5, sample)
    expect(sample.rgb).toBe(-1)
    expect(sample.inSrgb).toBe(false)
    expect(sample.inP3).toBe(false)
    expect(sample.inRec2020).toBe(false)

    // 横轴左端 c=0：灰色，可显示
    sampler(0, 0.5, sample)
    expect(sample.rgb).toBeGreaterThanOrEqual(0)
    expect(sample.inSrgb).toBe(true)
    expect(sample.inP3).toBe(true)
    expect(sample.inRec2020).toBe(true)
  })

  it('OKLCH：P3 / REC2020 边界附近色域等级递增', () => {
    // h=150、l=60 时：c≈0.16 内是 sRGB，0.2 左右进入 P3，0.3 进入 REC2020
    const sampler = createPanelSampler('oklch', { l: 60, c: 0, h: 150 }, 'c', 'l')
    const sample = createSample()

    const levels: number[] = []
    for (let index = 0; index <= 20; index += 1) {
      sampler(index / 20, 0.5, sample)
      levels.push(sample.rgb >= 0 ? 0 : sample.inP3 ? 1 : sample.inRec2020 ? 2 : 3)
    }
    // 从 sRGB 内一路递增到超出所有色域，边界线才有意义
    expect(levels[0]).toBe(0)
    expect(levels[20]).toBe(3)
    expect(levels.some((level) => level === 1)).toBe(true)
    expect(levels.some((level) => level === 2)).toBe(true)
  })
})

describe('assistantLightnessPalettes（配色助手的亮度来源）', () => {
  const COLOR: RgbColor = { r: 59, g: 130, b: 246 }

  it('RGB / HSL / HWB / CMYK 沿用 HSL 亮度（原有行为）', () => {
    const hsl = rgbToHsl(COLOR)
    for (const mode of ['rgb', 'hsl', 'hwb', 'cmyk'] as const) {
      const palettes = assistantLightnessPalettes(mode, COLOR)
      expect(palettes.source, mode).toBe('hsl')
      expect(palettes.byLightness, mode).toEqual(lightnessSwatches(hsl))
      expect(palettes.allLightness, mode).toEqual(allLightnessSwatches(hsl))
    }
  })

  /** 按「模式亮度通道」重建某一档的显示色（与实现同源，用于校验接线） */
  function expectedColor(
    mode: 'lab' | 'oklch' | 'ycbcr',
    key: string,
    lightness: number,
  ): RgbColor {
    const definition = modeDefinition(mode)
    const values = normalizeModeValues(mode, definition.fromRgb(COLOR))
    if (mode === 'lab') {
      return gamutMapLabToRgb({ l: lightness, a: values.a ?? 0, b: values.b ?? 0 })
    }
    if (mode === 'ycbcr') {
      return gamutMapYcbcrToRgb({ y: lightness, cb: values.cb ?? 128, cr: values.cr ?? 128 })
    }
    return definition.toRgb({ ...values, [key]: lightness })
  }

  it('LAB 按 LAB 的 L 亮度生成两套色板', () => {
    const palettes = assistantLightnessPalettes('lab', COLOR)
    expect(palettes.source).toBe('l')
    expect(palettes.byLightness.length).toBeGreaterThan(0)
    expect(palettes.allLightness).toHaveLength(20)
    expect(palettes.allLightness.map((swatch) => swatch.label)).toEqual(
      Array.from({ length: 20 }, (_, index) => `${(index + 1) * 5}%`),
    )

    const channel = channelDefinition('lab', 'l')
    expect(channel).toBeTruthy()
    const base = normalizeModeValues('lab', modeDefinition('lab').fromRgb(COLOR)).l ?? 0

    for (const swatch of palettes.byLightness) {
      const offset = Number(swatch.label.replace('%', ''))
      const lightness = Math.min(channel!.max, Math.max(channel!.min, base + offset))
      expect(swatch.rgb, swatch.label).toEqual(expectedColor('lab', 'l', lightness))
    }
    for (const swatch of palettes.allLightness) {
      const lightness = Number(swatch.label.replace('%', ''))
      expect(swatch.rgb, swatch.label).toEqual(expectedColor('lab', 'l', lightness))
    }

    // 亮度确实沿着 LAB 的 L 递增（显示色经保持 L 的色域映射，端点不会偏色）
    const byLab = palettes.byLightness.map((swatch) => rgbToLab(swatch.rgb).l)
    expect(byLab[byLab.length - 1]).toBeGreaterThan(byLab[0] ?? 0)
    // 100% → 白色、5% → 接近黑色
    expect(palettes.allLightness[19]?.rgb).toEqual({ r: 255, g: 255, b: 255 })
    const labDarkest = palettes.allLightness[0]?.rgb ?? { r: 0, g: 0, b: 0 }
    expect(labDarkest.r + labDarkest.g + labDarkest.b).toBeLessThan(120)
  })

  it('OKLCH 按 OKLCH 的 L 亮度生成两套色板', () => {
    const palettes = assistantLightnessPalettes('oklch', COLOR)
    expect(palettes.source).toBe('l')
    expect(palettes.allLightness).toHaveLength(20)

    const base = normalizeModeValues('oklch', modeDefinition('oklch').fromRgb(COLOR)).l ?? 0
    for (const swatch of palettes.byLightness) {
      const offset = Number(swatch.label.replace('%', ''))
      const lightness = Math.min(100, Math.max(0, base + offset))
      expect(swatch.rgb, swatch.label).toEqual(expectedColor('oklch', 'l', lightness))
    }
    for (const swatch of palettes.allLightness) {
      const lightness = Number(swatch.label.replace('%', ''))
      expect(swatch.rgb, swatch.label).toEqual(expectedColor('oklch', 'l', lightness))
    }

    const byOklch = palettes.byLightness.map((swatch) => rgbToOklch(swatch.rgb).l)
    expect(byOklch[byOklch.length - 1]).toBeGreaterThan(byOklch[0] ?? 0)
    // 100% → 白色、5% → 接近黑色
    expect(palettes.allLightness[19]?.rgb).toEqual({ r: 255, g: 255, b: 255 })
    const oklchDarkest = palettes.allLightness[0]?.rgb ?? { r: 0, g: 0, b: 0 }
    expect(oklchDarkest.r + oklchDarkest.g + oklchDarkest.b).toBeLessThan(120)
  })

  it('YCbCr 按 Y 亮度生成：偏移量是 0-255 范围的 5%', () => {
    const palettes = assistantLightnessPalettes('ycbcr', COLOR)
    expect(palettes.source).toBe('y')
    expect(palettes.allLightness).toHaveLength(20)
    expect(palettes.allLightness.map((swatch) => swatch.label)).toEqual(
      Array.from({ length: 20 }, (_, index) => `${(index + 1) * 5}%`),
    )

    const base = normalizeModeValues('ycbcr', modeDefinition('ycbcr').fromRgb(COLOR)).y ?? 0
    for (const swatch of palettes.byLightness) {
      const offset = Number(swatch.label.replace('%', ''))
      const luma = Math.min(255, Math.max(0, base + (offset / 100) * 255))
      expect(swatch.rgb, swatch.label).toEqual(expectedColor('ycbcr', 'y', luma))
    }
    for (const swatch of palettes.allLightness) {
      const luma = (Number(swatch.label.replace('%', '')) / 100) * 255
      expect(swatch.rgb, swatch.label).toEqual(expectedColor('ycbcr', 'y', luma))
    }

    // 中性灰（Cb = Cr = 128）没有任何通道被裁剪，Y 能精确往返
    const neutral = assistantLightnessPalettes('ycbcr', { r: 128, g: 128, b: 128 })
    for (const swatch of neutral.allLightness) {
      const expected = (Number(swatch.label.replace('%', '')) / 100) * 255
      expect(Math.abs(rgbToYcbcr(swatch.rgb).y - expected)).toBeLessThan(1)
    }

    // 100% → 白色、5% → 接近黑色
    expect(palettes.allLightness[19]?.rgb).toEqual({ r: 255, g: 255, b: 255 })
    const ycbcrDarkest = palettes.allLightness[0]?.rgb ?? { r: 0, g: 0, b: 0 }
    expect(ycbcrDarkest.r + ycbcrDarkest.g + ycbcrDarkest.b).toBeLessThan(120)
  })

  it('LAB / OKLCH / YCbCr 的色板与 HSL 色板不同（确实换了亮度来源）', () => {
    const hsl = assistantLightnessPalettes('hsl', COLOR)
    for (const mode of ['lab', 'oklch', 'ycbcr'] as const) {
      const palettes = assistantLightnessPalettes(mode, COLOR)
      expect(palettes.source).not.toBe('hsl')
      expect(palettes.byLightness).not.toEqual(hsl.byLightness)
      expect(palettes.allLightness).not.toEqual(hsl.allLightness)
    }
  })
})
