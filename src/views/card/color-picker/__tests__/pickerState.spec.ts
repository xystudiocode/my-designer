import { describe, expect, it } from 'vitest'
import {
  COLOR_PICKER_PATH,
  DEFAULT_ALPHA,
  DEFAULT_MODE,
  DEFAULT_RGB,
  HISTORY_LIMIT,
  PICKER_STORAGE_KEY,
  addPaletteColor,
  buildColorPickerLocation,
  buildColorPickerQuery,
  colorKey,
  createDefaultSettings,
  isSameColor,
  loadPickerSettings,
  normalizeStoredColor,
  parseColorInput,
  parsePickerQuery,
  pushHistory,
  removeHistoryColor,
  removePaletteColor,
  sanitizePickerSettings,
  savePickerSettings,
  storedColorToRgb,
  toStoredColor,
  type PickerStorage,
  type StoredColor,
} from '../pickerState'

function memoryStorage(): PickerStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

const RED: StoredColor = { r: 255, g: 0, b: 0, a: 100 }
const BLUE: StoredColor = { r: 59, g: 130, b: 246, a: 100 }

describe('toStoredColor / colorKey', () => {
  it('夹紧并取整 RGB 与不透明度', () => {
    expect(toStoredColor({ r: 300, g: -20, b: 127.6 }, 120)).toEqual({
      r: 255,
      g: 0,
      b: 128,
      a: 100,
    })
    expect(toStoredColor({ r: 1, g: 2, b: 3 }, 33.4).a).toBe(33)
  })

  it('颜色唯一键包含 RGB 与不透明度', () => {
    expect(colorKey(RED)).toBe('255,0,0,100')
    expect(isSameColor(RED, { ...RED })).toBe(true)
    expect(isSameColor(RED, { ...RED, a: 50 })).toBe(false)
    expect(storedColorToRgb(RED)).toEqual({ r: 255, g: 0, b: 0 })
  })
})

describe('pushHistory', () => {
  it('新颜色插入最前', () => {
    expect(pushHistory([BLUE], RED)).toEqual([RED, BLUE])
  })

  it('重复颜色移动到最前且不出现两份', () => {
    expect(pushHistory([BLUE, RED], RED)).toEqual([RED, BLUE])
  })

  it(`最多保留 ${HISTORY_LIMIT} 条`, () => {
    const history = Array.from({ length: HISTORY_LIMIT + 5 }, (_, index) => ({
      r: index,
      g: 0,
      b: 0,
      a: 100,
    }))
    const next = pushHistory(history, { r: 999, g: 1, b: 2, a: 100 })
    expect(next).toHaveLength(HISTORY_LIMIT)
    expect(next[0]).toEqual({ r: 999, g: 1, b: 2, a: 100 })
    expect(next.some((color) => color.r === HISTORY_LIMIT + 4)).toBe(false)
  })
})

describe('addPaletteColor / removePaletteColor', () => {
  it('新颜色插入最前，重复颜色移动到最前，不限量', () => {
    expect(addPaletteColor([], RED)).toEqual([RED])
    expect(addPaletteColor([BLUE, RED], RED)).toEqual([RED, BLUE])
    const many = Array.from({ length: 120 }, (_, index) => ({
      r: index,
      g: 0,
      b: 0,
      a: 100,
    }))
    expect(addPaletteColor(many, { r: 200, g: 1, b: 2, a: 100 })).toHaveLength(121)
  })

  it('按下标移除，越界时原样返回', () => {
    expect(removePaletteColor([RED, BLUE], 0)).toEqual([BLUE])
    expect(removePaletteColor([RED, BLUE], 5)).toEqual([RED, BLUE])
    expect(removePaletteColor([RED, BLUE], -1)).toEqual([RED, BLUE])
  })
})
describe('removeHistoryColor', () => {
  it('用户手动删除历史记录：按下标移除，越界原样返回，不修改入参', () => {
    const history = [RED, BLUE]
    expect(removeHistoryColor(history, 0)).toEqual([BLUE])
    expect(removeHistoryColor(history, 1)).toEqual([RED])
    expect(removeHistoryColor(history, 2)).toEqual([RED, BLUE])
    expect(removeHistoryColor(history, -1)).toEqual([RED, BLUE])
    expect(history).toEqual([RED, BLUE])
  })
})

describe('normalizeStoredColor / sanitizePickerSettings', () => {
  it('拒绝非法颜色，接受合法颜色并补默认透明度', () => {
    expect(normalizeStoredColor(null)).toBeNull()
    expect(normalizeStoredColor('red')).toBeNull()
    expect(normalizeStoredColor({ r: 'x', g: 0, b: 0 })).toBeNull()
    expect(normalizeStoredColor({ r: 1, g: 2, b: 3 })).toEqual({ r: 1, g: 2, b: 3, a: 100 })
  })

  it('把合法配置原样读回，非法字段回退默认值', () => {
    const settings = createDefaultSettings()
    settings.rgb = { r: 1, g: 2, b: 3 }
    settings.alpha = 40
    settings.mode = 'hsl'
    settings.history = [RED]
    settings.palette = [BLUE]
    const sanitized = sanitizePickerSettings({ ...settings, alpha: 40 })
    expect(sanitized).toEqual(settings)
    expect(sanitizePickerSettings(null)).toEqual(createDefaultSettings())
    expect(sanitizePickerSettings({ mode: 'hex' }).mode).toBe(DEFAULT_MODE)
  })

  it('历史记录截断到上限并去重，调色板去重', () => {
    const history = Array.from({ length: HISTORY_LIMIT + 10 }, (_, index) => ({
      r: index,
      g: 0,
      b: 0,
      a: 100,
    }))
    const sanitized = sanitizePickerSettings({ history, palette: [RED, RED, BLUE] })
    expect(sanitized.history).toHaveLength(HISTORY_LIMIT)
    expect(sanitized.palette).toEqual([RED, BLUE])
  })
})

describe('loadPickerSettings / savePickerSettings', () => {
  it('没有存储时返回默认配置', () => {
    expect(loadPickerSettings(memoryStorage())).toEqual(createDefaultSettings())
  })

  it('保存后可以原样读回', () => {
    const storage = memoryStorage()
    const settings = createDefaultSettings()
    settings.rgb = { r: 12, g: 34, b: 56 }
    settings.alpha = 80
    settings.mode = 'hsl'
    settings.history = [RED]
    settings.palette = [BLUE]
    savePickerSettings(settings, storage)
    expect(storage.data.has(PICKER_STORAGE_KEY)).toBe(true)
    expect(loadPickerSettings(storage)).toEqual(settings)
  })

  it('存储内容损坏时回退默认配置', () => {
    const storage = memoryStorage()
    storage.setItem(PICKER_STORAGE_KEY, '{not-json')
    expect(loadPickerSettings(storage)).toEqual(createDefaultSettings())
  })

  it('storage 不可用时不抛错', () => {
    const broken: PickerStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(() => loadPickerSettings(broken)).not.toThrow()
    expect(() => savePickerSettings(createDefaultSettings(), broken)).not.toThrow()
    expect(loadPickerSettings(broken)).toEqual(createDefaultSettings())
  })
})

describe('parseColorInput', () => {
  it('解析十六进制（3 / 4 / 6 / 8 位，带不带 # 均可）', () => {
    expect(parseColorInput('#ff0000')).toEqual({ rgb: { r: 255, g: 0, b: 0 }, alpha: null })
    expect(parseColorInput('f00')).toEqual({ rgb: { r: 255, g: 0, b: 0 }, alpha: null })
    expect(parseColorInput('#f00')).toEqual({ rgb: { r: 255, g: 0, b: 0 }, alpha: null })
    expect(parseColorInput('#00F')).toEqual({ rgb: { r: 0, g: 0, b: 255 }, alpha: null })
    const withAlpha = parseColorInput('#ff000080')
    expect(withAlpha?.rgb).toEqual({ r: 255, g: 0, b: 0 })
    expect(withAlpha?.alpha).toBe(50)
    expect(parseColorInput('#f00a')).toEqual({ rgb: { r: 255, g: 0, b: 0 }, alpha: 67 })
  })

  it('解析 rgb / rgba / hsl / hsla（含逗号与空格语法）', () => {
    expect(parseColorInput('rgb(255, 0, 0)')).toEqual({
      rgb: { r: 255, g: 0, b: 0 },
      alpha: null,
    })
    expect(parseColorInput('rgba(59, 130, 246, 0.5)')).toEqual({
      rgb: { r: 59, g: 130, b: 246 },
      alpha: 50,
    })
    expect(parseColorInput('rgb(59 130 246 / 50%)')).toEqual({
      rgb: { r: 59, g: 130, b: 246 },
      alpha: 50,
    })
    expect(parseColorInput('hsl(0, 100%, 50%)')).toEqual({
      rgb: { r: 255, g: 0, b: 0 },
      alpha: null,
    })
    expect(parseColorInput('hsla(0 100% 50% / 0.5)')?.alpha).toBe(50)
  })

  it('非法文本返回 null', () => {
    expect(parseColorInput('')).toBeNull()
    expect(parseColorInput('not-a-color')).toBeNull()
    expect(parseColorInput('#12345')).toBeNull()
    expect(parseColorInput('rgb(1,2)')).toBeNull()
  })
})

describe('parsePickerQuery', () => {
  it('解析颜色 / 模式 / 不透明度', () => {
    const query = parsePickerQuery({ color: 'E5254D', mode: 'hsl', alpha: '80' })
    expect(query).toEqual({
      hasQuery: true,
      rgb: { r: 229, g: 37, b: 77 },
      alpha: 80,
      mode: 'hsl',
    })
  })

  it('颜色自带的透明度会被 alpha 参数覆盖', () => {
    expect(parsePickerQuery({ color: '#ff000080', alpha: '20' }).alpha).toBe(20)
    expect(parsePickerQuery({ color: '#ff000080' }).alpha).toBe(50)
  })

  it('只带 mode 也算深链接，颜色为 null', () => {
    const query = parsePickerQuery({ mode: 'hwb' })
    expect(query.hasQuery).toBe(true)
    expect(query.rgb).toBeNull()
    expect(query.mode).toBe('hwb')
  })

  it('忽略非法模式与非法颜色', () => {
    const query = parsePickerQuery({ color: 'nope', mode: 'hex' })
    expect(query.hasQuery).toBe(true)
    expect(query.rgb).toBeNull()
    expect(query.mode).toBeNull()
  })

  it('数组 query（重复参数）取第一个字符串', () => {
    expect(parsePickerQuery({ color: ['#f00', '#00f'], mode: ['hsl'] }).mode).toBe('hsl')
    expect(parsePickerQuery({ color: ['#f00', '#00f'] }).rgb).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('没有相关参数时 hasQuery 为 false', () => {
    expect(parsePickerQuery({})).toEqual({ hasQuery: false, rgb: null, alpha: null, mode: null })
  })
})

describe('buildColorPickerQuery / buildColorPickerLocation', () => {
  it('生成不带 # 的十六进制与模式', () => {
    expect(buildColorPickerQuery({ r: 229, g: 37, b: 77 })).toEqual({
      color: 'E5254D',
      mode: DEFAULT_MODE,
    })
  })

  it('透明度 < 100 时携带 alpha', () => {
    expect(buildColorPickerQuery({ r: 255, g: 0, b: 0 }, 50, 'hsl')).toEqual({
      color: 'FF0000',
      mode: 'hsl',
      alpha: '50',
    })
    expect(buildColorPickerQuery({ r: 255, g: 0, b: 0 }, DEFAULT_ALPHA, 'rgb')).not.toHaveProperty(
      'alpha',
    )
  })

  it('生成可直接交给 router.push 的地址对象', () => {
    expect(buildColorPickerLocation({ r: 255, g: 0, b: 0 }, 100, 'rgb')).toEqual({
      path: COLOR_PICKER_PATH,
      query: { color: 'FF0000', mode: 'rgb' },
    })
  })

  it('默认值来自常量', () => {
    expect(DEFAULT_RGB).toEqual({ r: 59, g: 130, b: 246 })
  })
})
