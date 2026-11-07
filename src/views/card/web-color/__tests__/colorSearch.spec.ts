import { describe, expect, it } from 'vitest'
import { webSafeColors } from '../../../../data/colors'
import {
  WEB_SAFE_LEVELS,
  defaultWebSafeFilter,
  filterBySearch,
  filterWebSafeColors,
  isWebSafeFilterActive,
  isWebSafeFilterValue,
  matchesColorSearch,
  matchesWebSafeFilter,
  normalizeSearchQuery,
  type ColorSearchEntry,
  type WebSafeRgbFilter,
} from '../colorSearch'
import {
  DEFAULT_WEB_COLOR_MODE,
  WEB_COLOR_STORAGE_KEY,
  createDefaultWebColorSettings,
  isWebColorMode,
  loadWebColorSettings,
  sanitizeWebColorSettings,
  saveWebColorSettings,
  type WebColorStorage,
} from '../webColorState'

/** 测试用的颜色条目：中文名 / 英文名 / 简写 / HEX 齐全 */
const RED: ColorSearchEntry = {
  shorthand: 'red',
  hex: '#ff0000',
  names: ['红色', 'Red'],
}

const DARK_GOLDENROD: ColorSearchEntry = {
  shorthand: 'darkgoldenrod',
  hex: '#b8860b',
  names: ['暗金菊色', 'Dark Goldenrod'],
}

const TRANSPARENT: ColorSearchEntry = {
  shorthand: 'transparent',
  hex: 'transparent',
  names: ['透明', 'Transparent'],
}

const ENTRIES = [RED, DARK_GOLDENROD, TRANSPARENT]

describe('normalizeSearchQuery', () => {
  it('去首尾空白、转小写、去掉 HEX 前缀 #', () => {
    expect(normalizeSearchQuery('  #FF0000 ')).toBe('ff0000')
    expect(normalizeSearchQuery('#F00')).toBe('f00')
    expect(normalizeSearchQuery('Red')).toBe('red')
    expect(normalizeSearchQuery('   ')).toBe('')
  })
})

describe('matchesColorSearch / filterBySearch', () => {
  it('空搜索词匹配全部', () => {
    expect(matchesColorSearch(RED, '')).toBe(true)
    expect(matchesColorSearch(RED, '   ')).toBe(true)
    expect(filterBySearch(ENTRIES, '')).toEqual(ENTRIES)
  })

  it('按中文名匹配（支持部分文字）', () => {
    expect(matchesColorSearch(RED, '红色')).toBe(true)
    expect(matchesColorSearch(RED, '红')).toBe(true)
    expect(matchesColorSearch(DARK_GOLDENROD, '暗金')).toBe(true)
    expect(matchesColorSearch(RED, '蓝')).toBe(false)
  })

  it('按英文名匹配，忽略大小写与首尾空格', () => {
    expect(matchesColorSearch(RED, 'Red')).toBe(true)
    expect(matchesColorSearch(RED, ' RED ')).toBe(true)
    expect(matchesColorSearch(DARK_GOLDENROD, 'dark goldenrod')).toBe(true)
    expect(matchesColorSearch(DARK_GOLDENROD, 'Golden')).toBe(true)
    expect(matchesColorSearch(RED, 'blue')).toBe(false)
  })

  it('按简写匹配', () => {
    expect(matchesColorSearch(RED, 'red')).toBe(true)
    expect(matchesColorSearch(DARK_GOLDENROD, 'goldenrod')).toBe(true)
    expect(matchesColorSearch(TRANSPARENT, 'trans')).toBe(true)
    expect(matchesColorSearch(RED, 'dark')).toBe(false)
  })

  it('按 HEX 匹配：忽略大小写与 #、支持 3 / 6 位与包含匹配', () => {
    expect(matchesColorSearch(RED, '#ff0000')).toBe(true)
    expect(matchesColorSearch(RED, 'FF0000')).toBe(true)
    expect(matchesColorSearch(RED, '#F00')).toBe(true)
    expect(matchesColorSearch(RED, 'f00')).toBe(true)
    expect(matchesColorSearch(RED, '0000')).toBe(true)
    expect(matchesColorSearch(DARK_GOLDENROD, '#B8860B')).toBe(true)
    expect(matchesColorSearch(RED, '#00ff00')).toBe(false)
    expect(matchesColorSearch(RED, 'zzz')).toBe(false)
  })

  it('filterBySearch 只保留命中项并保持原顺序', () => {
    expect(filterBySearch(ENTRIES, '红')).toEqual([RED])
    expect(filterBySearch(ENTRIES, 'n')).toEqual([DARK_GOLDENROD, TRANSPARENT])
    expect(filterBySearch(ENTRIES, 'no-such-color')).toEqual([])
  })
})

describe('matchesWebSafeFilter / filterWebSafeColors', () => {
  const items = webSafeColors.map((hex) => ({ hex }))

  it('三个通道都是「任意」时不过滤，返回全部 216 个网页安全色', () => {
    expect(webSafeColors).toHaveLength(216)
    expect(filterWebSafeColors(items, defaultWebSafeFilter())).toHaveLength(216)
    expect(isWebSafeFilterActive(defaultWebSafeFilter())).toBe(false)
  })

  it('单通道筛选：R / G / B 分别生效', () => {
    const rOnly: WebSafeRgbFilter = { r: 'ff', g: 'any', b: 'any' }
    const reds = filterWebSafeColors(items, rOnly)
    expect(reds).toHaveLength(36)
    expect(reds.every((item) => item.hex.slice(1, 3) === 'ff')).toBe(true)

    const gOnly: WebSafeRgbFilter = { r: 'any', g: '00', b: 'any' }
    const greens = filterWebSafeColors(items, gOnly)
    expect(greens).toHaveLength(36)
    expect(greens.every((item) => item.hex.slice(3, 5) === '00')).toBe(true)

    const bOnly: WebSafeRgbFilter = { r: 'any', g: 'any', b: 'cc' }
    const blues = filterWebSafeColors(items, bOnly)
    expect(blues).toHaveLength(36)
    expect(blues.every((item) => item.hex.slice(5, 7) === 'cc')).toBe(true)
  })

  it('多通道组合筛选', () => {
    expect(filterWebSafeColors(items, { r: 'ff', g: '00', b: '33' })).toEqual([{ hex: '#ff0033' }])
    expect(filterWebSafeColors(items, { r: 'ff', g: '00', b: 'any' })).toHaveLength(6)
    expect(filterWebSafeColors(items, { r: 'ff', g: 'ff', b: 'ff' })).toEqual([{ hex: '#ffffff' }])
    expect(isWebSafeFilterActive({ r: 'ff', g: 'any', b: 'any' })).toBe(true)
    expect(isWebSafeFilterActive({ r: 'any', g: 'any', b: 'ff' })).toBe(true)
  })

  it('无匹配时返回空数组，非 6 位 HEX 不参与筛选', () => {
    expect(filterWebSafeColors([{ hex: '#123456' }], { r: 'ff', g: 'any', b: 'any' })).toEqual([])
    expect(matchesWebSafeFilter('#123456', { r: 'ff', g: 'any', b: 'any' })).toBe(false)
    expect(matchesWebSafeFilter('transparent', defaultWebSafeFilter())).toBe(false)
  })

  it('忽略大小写与 # 前缀', () => {
    expect(matchesWebSafeFilter('#FF0033', { r: 'ff', g: '00', b: '33' })).toBe(true)
    expect(matchesWebSafeFilter('ff0033', { r: 'ff', g: '00', b: '33' })).toBe(true)
    expect(matchesWebSafeFilter('#ff0033', { r: 'ff', g: '00', b: '66' })).toBe(false)
  })

  it('校验筛选值：只接受「任意」或六档', () => {
    expect(isWebSafeFilterValue('any')).toBe(true)
    for (const level of WEB_SAFE_LEVELS) expect(isWebSafeFilterValue(level)).toBe(true)
    expect(isWebSafeFilterValue('12')).toBe(false)
    expect(isWebSafeFilterValue('CC')).toBe(false)
    expect(isWebSafeFilterValue(null)).toBe(false)
    expect(isWebSafeFilterValue(undefined)).toBe(false)
  })
})

/** 内存版 localStorage，行为与浏览器 localStorage 的最小接口一致 */
function memoryStorage(): WebColorStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

describe('webColorState', () => {
  it('默认显示 CSS 命名色', () => {
    expect(DEFAULT_WEB_COLOR_MODE).toBe('css')
    expect(createDefaultWebColorSettings()).toEqual({ mode: 'css' })
    expect(loadWebColorSettings(memoryStorage())).toEqual({ mode: 'css' })
    expect(loadWebColorSettings(null)).toEqual({ mode: 'css' })
  })

  it('保存后可以读回上次选择', () => {
    const storage = memoryStorage()
    saveWebColorSettings({ mode: 'websafe' }, storage)
    expect(storage.data.has(WEB_COLOR_STORAGE_KEY)).toBe(true)
    expect(loadWebColorSettings(storage)).toEqual({ mode: 'websafe' })

    saveWebColorSettings({ mode: 'css' }, storage)
    expect(loadWebColorSettings(storage)).toEqual({ mode: 'css' })
  })

  it('非法值回退默认（损坏 JSON / 未知模式 / 非对象）', () => {
    const storage = memoryStorage()
    storage.setItem(WEB_COLOR_STORAGE_KEY, '{not-json')
    expect(loadWebColorSettings(storage)).toEqual(createDefaultWebColorSettings())

    storage.setItem(WEB_COLOR_STORAGE_KEY, JSON.stringify({ mode: 'hex' }))
    expect(loadWebColorSettings(storage)).toEqual(createDefaultWebColorSettings())

    expect(sanitizeWebColorSettings(null)).toEqual(createDefaultWebColorSettings())
    expect(sanitizeWebColorSettings('css')).toEqual(createDefaultWebColorSettings())
    expect(sanitizeWebColorSettings({ mode: 42 })).toEqual(createDefaultWebColorSettings())
    // 合法字段之外的旧数据被丢弃，不会带到页面
    expect(sanitizeWebColorSettings({ mode: 'websafe', extra: true })).toEqual({ mode: 'websafe' })
  })

  it('storage 不可用时不抛错', () => {
    const broken: WebColorStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(() => loadWebColorSettings(broken)).not.toThrow()
    expect(() => saveWebColorSettings({ mode: 'websafe' }, broken)).not.toThrow()
    expect(loadWebColorSettings(broken)).toEqual(createDefaultWebColorSettings())
  })

  it('isWebColorMode 只接受两种显示模式', () => {
    expect(isWebColorMode('css')).toBe(true)
    expect(isWebColorMode('websafe')).toBe(true)
    expect(isWebColorMode('rgb')).toBe(false)
    expect(isWebColorMode(null)).toBe(false)
  })
})
