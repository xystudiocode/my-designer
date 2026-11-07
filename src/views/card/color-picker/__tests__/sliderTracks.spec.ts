import { describe, expect, it } from 'vitest'
import {
  alphaTrackBackground,
  channelTrackColors,
  channelTrackMarkers,
  TRACK_STOPS,
} from '../sliderTracks'

const BLUE = { r: 59, g: 130, b: 246 }

describe('sliderTracks', () => {
  it('非 OKLCH 模式：32 个 rgb() 停靠点、没有分隔线', () => {
    const colors = channelTrackColors('hsl', { h: 210, s: 80, l: 50 }, 'h')
    expect(colors).toHaveLength(TRACK_STOPS)
    for (const color of colors) expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
    expect(channelTrackMarkers('hsl', { h: 210, s: 80, l: 50 }, 'h')).toEqual([])
  })

  it('OKLCH 色相轨道：超出 sRGB 的停靠点为白色，并有 60° 实线 + 色域边界虚线', () => {
    const values = { l: 60, c: 0.12, h: 200 }
    const colors = channelTrackColors('oklch', values, 'h')
    expect(colors).toHaveLength(TRACK_STOPS)
    expect(colors).toContain('#ffffff')

    const markers = channelTrackMarkers('oklch', values, 'h')
    const solid = markers.filter((marker) => !marker.dashed)
    const dashed = markers.filter((marker) => marker.dashed)
    // 每 60° 一条实线刻度：60 / 120 / 180 / 240 / 300 共 5 条
    expect(solid).toHaveLength(5)
    expect(solid.map((marker) => Math.round(marker.position))).toEqual([17, 33, 50, 67, 83])
    // c = 0.12 时色相轨道存在可显示 ↔ 不可显示边界
    expect(dashed.length).toBeGreaterThan(0)
    for (const marker of dashed) {
      expect(marker.position).toBeGreaterThanOrEqual(0)
      expect(marker.position).toBeLessThanOrEqual(100)
    }
  })

  it('OKLCH 彩度轨道同样带虚线边界；分量不存在时返回空数组', () => {
    expect(channelTrackMarkers('oklch', { l: 60, c: 0.12, h: 200 }, 'c').length).toBeGreaterThan(0)
    expect(channelTrackColors('hsl', { h: 0, s: 0, l: 0 }, 'unknown')).toEqual([])
    expect(channelTrackMarkers('oklch', { l: 60, c: 0.12, h: 200 }, 'unknown')).toEqual([])
  })

  it('不透明度轨道：同色透明 → 不透明渐变 + 8px 棋盘格', () => {
    const style = alphaTrackBackground(BLUE)
    expect(style.backgroundImage).toContain('rgba(59, 130, 246, 0)')
    expect(style.backgroundImage).toContain('rgb(59, 130, 246)')
    expect(style.backgroundImage).toContain('repeating-conic-gradient')
    expect(style.backgroundSize).toBe('auto, 16px 16px')
  })
})
