/**
 * 颜色选择器的「用户配置」工具（纯函数，不依赖 Vue）：
 *
 * - 本地持久化：当前颜色 / 不透明度 / 模式 / 历史记录 / 调色板，进入页面时自动恢复；
 * - 深链接：`/card/color-picker?color=E5254D&mode=hsl&alpha=80` 这类 URL 的解析与生成，
 *   供网页颜色页 ColorCard 的「在颜色选择器中打开」使用；
 * - 历史记录：最多 40 条，新颜色插入最前，重复颜色移动到最前（不会出现两次）；
 * - 调色板：用户手动添加，不限量，页面按「当前列数 × 3 行」分页展示。
 *
 * 存储读写全部包在 try/catch 里：隐私模式 / 存储被禁用时退回默认值，不阻塞页面。
 */
import {
  COLOR_MODES,
  clamp,
  hslToRgb,
  normalizeRgb,
  rgbToHex,
  type ColorFormat,
  type RgbColor,
} from './color'

/** 持久化到 localStorage 的颜色：sRGB 0-255 + 不透明度 0-100 */
export interface StoredColor {
  r: number
  g: number
  b: number
  a: number
}

/**
 * 取色模式的坐标轴设置：滑块 / 横轴 / 纵轴分别对应哪个分量（如 HSL 的 h / s / l）。
 * 只有带二维色板的模式会用到，RGB / CMYK 保留占位值。
 */
export interface AxisSetting {
  slider: string
  x: string
  y: string
}

export type AxisSettings = Record<ColorFormat, AxisSetting>

/** 各模式的默认坐标轴设置（TODO：原来的值作为默认值；滑块 / 横轴 / 纵轴互不相同） */
const DEFAULT_AXIS_SETTINGS: AxisSettings = {
  rgb: { slider: 'r', x: 'g', y: 'b' },
  hex: { slider: 'r', x: 'g', y: 'b' },
  cmyk: { slider: 'c', x: 'm', y: 'y' },
  hsl: { slider: 'h', x: 's', y: 'l' },
  hwb: { slider: 'h', x: 'w', y: 'b' },
  lab: { slider: 'l', x: 'a', y: 'b' },
  oklch: { slider: 'h', x: 'c', y: 'l' },
  ycbcr: { slider: 'y', x: 'cb', y: 'cr' },
}

/** 默认坐标轴设置（返回深拷贝，避免调用方修改共享常量） */
export function defaultAxisSettings(): AxisSettings {
  const result = {} as AxisSettings
  for (const mode of COLOR_MODES) {
    result[mode] = { ...DEFAULT_AXIS_SETTINGS[mode] }
  }
  return result
}

/** 把任意来源（storage）的值收敛成合法的坐标轴设置；非法项回退默认值 */
export function sanitizeAxisSettings(value: unknown): AxisSettings {
  const fallback = defaultAxisSettings()
  if (!value || typeof value !== 'object') return fallback
  const record = value as Record<string, unknown>

  for (const mode of COLOR_MODES) {
    const entry = record[mode]
    if (!entry || typeof entry !== 'object') continue
    const { slider, x, y } = entry as Record<string, unknown>
    if (typeof slider !== 'string' || typeof x !== 'string' || typeof y !== 'string') continue
    // 三个分量必须互不相同，否则保留默认值（具体 key 是否属于该模式由 modes.ts 再校验）
    if (new Set([slider, x, y]).size !== 3) continue
    fallback[mode] = { slider, x, y }
  }
  return fallback
}

/** 颜色选择器需要记住的全部用户设置 */
export interface PickerSettings {
  rgb: RgbColor
  alpha: number
  mode: ColorFormat
  /** 历史记录：最新在最前，最多 HISTORY_LIMIT 条 */
  history: StoredColor[]
  /** 调色板：用户手动添加，不限量，展示时每页 PALETTE_PAGE_SIZE 条 */
  palette: StoredColor[]
  /** 各模式的坐标轴设置（滑块 / 横轴 / 纵轴） */
  axes: AxisSettings
}

/** 本地存储 key；改 key 相当于清空所有用户配置 */
export const PICKER_STORAGE_KEY = 'my-designer:color-picker'

/** 历史记录上限（需求：最多 40 条） */
export const HISTORY_LIMIT = 40

/** 调色板每页的行数（调色板高度按 3 行预留，翻页器 / 左右箭头位置保持稳定） */
export const PALETTE_PAGE_ROWS = 3

/**
 * 调色板每页条数的兜底值：实际每页条数 = 当前每行列数 × PALETTE_PAGE_ROWS
 * （由 ColorPalette.vue 测量；1440 宽下 18 列 × 3 行 = 54）。
 */
export const PALETTE_PAGE_SIZE = 54

/** 颜色选择器路由（跳转与深链接共用） */
export const COLOR_PICKER_PATH = '/card/color-picker'

export const DEFAULT_RGB: RgbColor = { r: 59, g: 130, b: 246 }
export const DEFAULT_ALPHA = 100
export const DEFAULT_MODE: ColorFormat = 'rgb'

/** 深链接允许传递的 query：color = 颜色文本，alpha = 0-100，mode = 取色模式 */
export interface ColorPickerQuery {
  /** URL 里是否带了任意一个可识别的参数（带了就不要自动加载本地保存的当前颜色） */
  hasQuery: boolean
  rgb: RgbColor | null
  alpha: number | null
  mode: ColorFormat | null
}

/** 与浏览器 localStorage 对齐的最小接口，方便单元测试注入内存实现 */
export interface PickerStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function createDefaultSettings(): PickerSettings {
  return {
    rgb: { ...DEFAULT_RGB },
    alpha: DEFAULT_ALPHA,
    mode: DEFAULT_MODE,
    history: [],
    palette: [],
    axes: defaultAxisSettings(),
  }
}

/** 颜色 + 不透明度 → 可持久化的记录（夹紧并取整） */
export function toStoredColor(rgb: RgbColor, alpha: number): StoredColor {
  const color = normalizeRgb(rgb)
  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: Math.round(clamp(alpha, 0, 100)),
  }
}

export function storedColorToRgb(color: StoredColor): RgbColor {
  return { r: color.r, g: color.g, b: color.b }
}

/** 颜色唯一键：RGB + 不透明度都相同才算同一种颜色 */
export function colorKey(color: StoredColor): string {
  return `${color.r},${color.g},${color.b},${color.a}`
}

export function isSameColor(a: StoredColor, b: StoredColor): boolean {
  return colorKey(a) === colorKey(b)
}

/**
 * 写入历史记录：重复颜色先移除再插入最前；超出上限截断。
 * 不修改入参，返回新数组。
 */
export function pushHistory(
  history: readonly StoredColor[],
  color: StoredColor,
  limit: number = HISTORY_LIMIT,
): StoredColor[] {
  const next = [{ ...color }, ...history.filter((item) => !isSameColor(item, color))]
  return next.slice(0, Math.max(1, Math.round(limit)))
}

/**
 * 加入调色板：同一颜色已存在时移动到最前，避免重复；不限量。
 * 新颜色也插到最前，这样添加后第 1 页就能看到。
 */
export function addPaletteColor(
  palette: readonly StoredColor[],
  color: StoredColor,
): StoredColor[] {
  return [{ ...color }, ...palette.filter((item) => !isSameColor(item, color))]
}

/** 去掉数组中的某一项（按下标，越界时原样返回） */
function removeByIndex(items: readonly StoredColor[], index: number): StoredColor[] {
  if (!Number.isInteger(index) || index < 0 || index >= items.length) return [...items]
  return items.filter((_, current) => current !== index)
}

/** 从调色板移除某一项（按下标，越界时原样返回） */
export function removePaletteColor(palette: readonly StoredColor[], index: number): StoredColor[] {
  return removeByIndex(palette, index)
}

/** 从历史记录移除某一项（用户手动删除；按下标，越界时原样返回） */
export function removeHistoryColor(history: readonly StoredColor[], index: number): StoredColor[] {
  return removeByIndex(history, index)
}

export function isColorFormat(value: string): value is ColorFormat {
  return (COLOR_MODES as readonly string[]).includes(value)
}

/** 把任意来源（localStorage / query）的值收敛成合法颜色；非法返回 null */
export function normalizeStoredColor(value: unknown): StoredColor | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const alpha = record.a === undefined ? 100 : Number(record.a)
  const r = Number(record.r)
  const g = Number(record.g)
  const b = Number(record.b)
  if (![r, g, b, alpha].every((item) => Number.isFinite(item))) return null
  return toStoredColor({ r, g, b }, alpha)
}

function dedupeColors(colors: readonly StoredColor[]): StoredColor[] {
  const seen = new Set<string>()
  const result: StoredColor[] = []
  for (const color of colors) {
    const key = colorKey(color)
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ ...color })
  }
  return result
}

/** 把任意值收敛成完整的用户配置（用于读取 storage 后的防御性校验） */
export function sanitizePickerSettings(value: unknown): PickerSettings {
  const fallback = createDefaultSettings()
  if (!value || typeof value !== 'object') return fallback
  const record = value as Record<string, unknown>

  const rgb = normalizeStoredColor(record.rgb)
  const storedAlpha = Number(record.alpha)
  const mode =
    typeof record.mode === 'string' && isColorFormat(record.mode) ? record.mode : fallback.mode

  const history = Array.isArray(record.history)
    ? dedupeColors(
        record.history
          .map(normalizeStoredColor)
          .filter((item): item is StoredColor => item !== null),
      ).slice(0, HISTORY_LIMIT)
    : []

  const palette = Array.isArray(record.palette)
    ? dedupeColors(
        record.palette
          .map(normalizeStoredColor)
          .filter((item): item is StoredColor => item !== null),
      )
    : []

  return {
    rgb: rgb ? storedColorToRgb(rgb) : fallback.rgb,
    alpha: Number.isFinite(storedAlpha)
      ? Math.round(clamp(storedAlpha, 0, 100))
      : rgb
        ? rgb.a
        : fallback.alpha,
    mode,
    history,
    palette,
    axes: sanitizeAxisSettings(record.axes),
  }
}

/** 默认 localStorage；不可用时返回 null（如 SSR / 隐私模式） */
export function resolveDefaultStorage(): PickerStorage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

export function loadPickerSettings(
  storage: PickerStorage | null = resolveDefaultStorage(),
): PickerSettings {
  if (!storage) return createDefaultSettings()
  let raw: string | null = null
  try {
    raw = storage.getItem(PICKER_STORAGE_KEY)
  } catch {
    return createDefaultSettings()
  }
  if (!raw) return createDefaultSettings()
  try {
    return sanitizePickerSettings(JSON.parse(raw))
  } catch {
    return createDefaultSettings()
  }
}

export function savePickerSettings(
  settings: PickerSettings,
  storage: PickerStorage | null = resolveDefaultStorage(),
): void {
  if (!storage) return
  const payload = {
    rgb: toStoredColor(settings.rgb, settings.alpha),
    alpha: settings.alpha,
    mode: settings.mode,
    history: settings.history,
    palette: settings.palette,
    axes: settings.axes,
  }
  try {
    storage.setItem(PICKER_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 存储写满 / 被禁用时忽略：只在当前会话生效
  }
}

function parseAlpha(value: string): number | null {
  const text = value.trim()
  if (text === '') return null
  const isPercent = text.endsWith('%')
  const parsed = Number(isPercent ? text.slice(0, -1) : text)
  if (!Number.isFinite(parsed)) return null
  const alpha = isPercent ? parsed : parsed <= 1 ? parsed * 100 : parsed
  return Math.round(clamp(alpha, 0, 100))
}

function expandHex(hex: string): string | null {
  if (hex.length === 3 || hex.length === 4) {
    return hex
      .split('')
      .map((char) => char + char)
      .join('')
  }
  if (hex.length === 6 || hex.length === 8) return hex
  return null
}

/**
 * 解析用户 / URL 传入的颜色文本，支持：
 * - 十六进制：`#f00`、`#f00a`、`#ff0000`、`#ff000080`（带不带 `#` 均可）
 * - `rgb(255, 0, 0)` / `rgba(255, 0, 0, 0.5)`
 * - `hsl(0, 100%, 50%)` / `hsla(0, 100%, 50%, 0.5)`
 *
 * 返回值里的 alpha 为 0-100；文本里没写透明度时为 null（交给调用方决定默认值）。
 */
export function parseColorInput(text: string): { rgb: RgbColor; alpha: number | null } | null {
  const value = text.trim()
  if (value === '') return null

  const hexMatch = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value)
  if (hexMatch) {
    const hex = expandHex(hexMatch[1] ?? '')
    if (!hex) return null
    const r = Number.parseInt(hex.slice(0, 2), 16)
    const g = Number.parseInt(hex.slice(2, 4), 16)
    const b = Number.parseInt(hex.slice(4, 6), 16)
    const alpha =
      hex.length === 8 ? Math.round((Number.parseInt(hex.slice(6, 8), 16) / 255) * 100) : null
    return { rgb: { r, g, b }, alpha }
  }

  const rgbMatch =
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(value)
  if (rgbMatch) {
    return {
      rgb: {
        r: Number(rgbMatch[1]),
        g: Number(rgbMatch[2]),
        b: Number(rgbMatch[3]),
      },
      alpha: rgbMatch[4] === undefined ? null : parseAlpha(rgbMatch[4]),
    }
  }

  const hslMatch =
    /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(
      value,
    )
  if (hslMatch) {
    return {
      rgb: hslToRgb({
        h: Number(hslMatch[1]),
        s: Number(hslMatch[2]),
        l: Number(hslMatch[3]),
      }),
      alpha: hslMatch[4] === undefined ? null : parseAlpha(hslMatch[4]),
    }
  }

  return null
}

function firstQueryValue(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string')
    return typeof first === 'string' ? first : null
  }
  return null
}

/**
 * 解析 `/card/color-picker?color=...&mode=...&alpha=...` 的 query。
 * `hasQuery` 只表示 URL 是否带了颜色相关参数（带了就不要自动加载本地保存的当前颜色）。
 */
export function parsePickerQuery(query: Record<string, unknown>): ColorPickerQuery {
  const colorText = firstQueryValue(query.color)
  const parsed = colorText === null ? null : parseColorInput(colorText)
  const alphaText = firstQueryValue(query.alpha)
  const modeText = firstQueryValue(query.mode)

  let alpha = parsed?.alpha ?? null
  if (alphaText !== null) {
    const parsedAlpha = parseAlpha(alphaText)
    if (parsedAlpha !== null) alpha = parsedAlpha
  }

  return {
    hasQuery: colorText !== null || alphaText !== null || modeText !== null,
    rgb: parsed?.rgb ?? null,
    alpha,
    mode: modeText !== null && isColorFormat(modeText) ? modeText : null,
  }
}

/**
 * 生成跳转到颜色选择器的 query（供网页颜色页 ColorCard 使用）。
 * 颜色用不带 `#` 的十六进制，透明度只在 < 100 时携带。
 */
export function buildColorPickerQuery(
  rgb: RgbColor,
  alpha: number = DEFAULT_ALPHA,
  mode: ColorFormat = DEFAULT_MODE,
): Record<string, string> {
  const color = toStoredColor(rgb, alpha)
  const query: Record<string, string> = {
    color: rgbToHex(color).replace('#', ''),
    mode,
  }
  if (color.a < 100) query.alpha = String(color.a)
  return query
}

/** 生成带 query 的路由地址对象 */
export function buildColorPickerLocation(
  rgb: RgbColor,
  alpha: number = DEFAULT_ALPHA,
  mode: ColorFormat = DEFAULT_MODE,
): { path: string; query: Record<string, string> } {
  return { path: COLOR_PICKER_PATH, query: buildColorPickerQuery(rgb, alpha, mode) }
}
