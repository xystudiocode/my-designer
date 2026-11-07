/**
 * 滑块轨道（多滑块区域的横向滑块 + 二维图右侧竖向滑块）共用的纯函数。
 *
 * 轨道渐变：用 `sliderBase` 取其它分量的基准值，滑块分量从 min→max 取 32 个停靠点，
 * 每个停靠点 `toRgb` 后转成 `rgb()` 字符串；OKLCH 额外处理：
 * - 超出 sRGB 的停靠点渲染为白色 `#ffffff`；
 * - 色相轨道每 60° 一条实线细刻度；
 * - 可显示 ↔ 不可显示的边界画虚线（二分细化边界位置）。
 *
 * 本文件不依赖 Vue，横向 / 竖向滑块只负责把结果映射到自己的方向与 DOM 结构上。
 */
import {
  normalizeRgb,
  oklchGamutStatus,
  oklchToRgb,
  clamp,
  type ColorFormat,
  type OklchColor,
  type RgbColor,
} from './color'
import { isHueChannel, modeDefinition, type ModeChannelDef, type ModeValues } from './modes'

/** 轨道渐变的停靠点数量（与 DESIGN 约定一致：25~32 个） */
export const TRACK_STOPS = 32

/** 虚线边界线二分细化的次数 */
const BOUNDARY_STEPS = 12

export interface TrackMarker {
  key: string
  /** 轨道上的百分比位置（0-100，从 min 指向 max） */
  position: number
  /** true = 可显示边界（虚线）；false = 60° 分段刻度（实线） */
  dashed: boolean
}

function num(value: number | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** 从 ModeValues 读出 OKLCH（分量越界时夹紧） */
function oklchOf(values: ModeValues): OklchColor {
  return {
    l: clamp(num(values.l), 0, 100),
    c: Math.max(0, num(values.c)),
    h: num(values.h),
  }
}

function rgbText(rgb: RgbColor): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
}

/** 某个模式取值在轨道上的显示色（OKLCH 超出 sRGB 时为纯白） */
function stopColorText(mode: ColorFormat, values: ModeValues): string {
  if (mode === 'oklch') {
    const oklch = oklchOf(values)
    return oklchGamutStatus(oklch).inSrgb ? rgbText(oklchToRgb(oklch)) : '#ffffff'
  }
  return rgbText(modeDefinition(mode).toRgb(values))
}

/** 某个滑块分量在轨道某位置是否可显示（仅 OKLCH 需要） */
function channelDisplayable(
  mode: ColorFormat,
  values: ModeValues,
  channel: ModeChannelDef,
  value: number,
): boolean {
  if (mode !== 'oklch') return true
  const base = modeDefinition(mode).sliderBase(channel.key, values)
  return oklchGamutStatus(oklchOf({ ...base, [channel.key]: value })).inSrgb
}

/** 二分找到可显示 ↔ 不可显示的边界值 */
function findBoundary(
  mode: ColorFormat,
  values: ModeValues,
  channel: ModeChannelDef,
  fromValue: number,
  toValue: number,
  fromDisplayable: boolean,
): number {
  let low = fromValue
  let high = toValue
  for (let step = 0; step < BOUNDARY_STEPS; step += 1) {
    const middle = (low + high) / 2
    if (channelDisplayable(mode, values, channel, middle) === fromDisplayable) low = middle
    else high = middle
  }
  return (low + high) / 2
}

function ratioToPercent(channel: ModeChannelDef, value: number): number {
  const span = channel.max - channel.min
  if (!(span > 0)) return 0
  return clamp(((value - channel.min) / span) * 100, 0, 100)
}

/** 查找某个模式分量（不存在时返回 undefined） */
function findChannel(mode: ColorFormat, channelKey: string): ModeChannelDef | undefined {
  return modeDefinition(mode).channels.find((channel) => channel.key === channelKey)
}

/** 滑块轨道渐变颜色（min → max，共 TRACK_STOPS 个停靠点） */
export function channelTrackColors(
  mode: ColorFormat,
  values: ModeValues,
  channelKey: string,
): string[] {
  const channel = findChannel(mode, channelKey)
  if (!channel) return []

  const definition = modeDefinition(mode)
  const base = definition.sliderBase(channel.key, values)
  const colors: string[] = []
  for (let index = 0; index < TRACK_STOPS; index += 1) {
    const ratio = index / (TRACK_STOPS - 1)
    const value = channel.min + (channel.max - channel.min) * ratio
    colors.push(stopColorText(mode, { ...base, [channel.key]: value }))
  }
  return colors
}

/** 轨道上的分隔线：色相 60° 实线刻度 + OKLCH 可显示边界虚线 */
export function channelTrackMarkers(
  mode: ColorFormat,
  values: ModeValues,
  channelKey: string,
): TrackMarker[] {
  if (mode !== 'oklch') return []
  const channel = findChannel(mode, channelKey)
  if (!channel) return []

  const markers: TrackMarker[] = []

  // 色相轨道：每 60° 一条实线细刻度（0° 与 360° 是轨道两端，不画）
  if (isHueChannel(channel)) {
    for (let angle = 60; angle < 360; angle += 60) {
      markers.push({
        key: `angle-${angle}`,
        position: ratioToPercent(channel, angle),
        dashed: false,
      })
    }
  }

  // 可显示 ↔ 不可显示边界：逐段扫描 + 二分细化
  const segments = 24
  let previousValue = channel.min
  let previousDisplayable = channelDisplayable(mode, values, channel, previousValue)
  for (let index = 1; index <= segments; index += 1) {
    const value = channel.min + ((channel.max - channel.min) * index) / segments
    const displayable = channelDisplayable(mode, values, channel, value)
    if (displayable !== previousDisplayable) {
      const boundary = findBoundary(
        mode,
        values,
        channel,
        previousValue,
        value,
        previousDisplayable,
      )
      markers.push({
        key: `boundary-${index}`,
        position: ratioToPercent(channel, boundary),
        dashed: true,
      })
    }
    previousValue = value
    previousDisplayable = displayable
  }
  return markers
}

/** 不透明度轨道：同色透明→不透明渐变叠在 8px 棋盘格上 */
export function alphaTrackBackground(rgb: RgbColor): {
  backgroundImage: string
  backgroundSize: string
} {
  const { r, g, b } = normalizeRgb(rgb)
  return {
    backgroundImage:
      `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0), rgb(${r}, ${g}, ${b})), ` +
      'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%)',
    backgroundSize: 'auto, 16px 16px',
  }
}
