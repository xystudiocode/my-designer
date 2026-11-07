/**
 * 网页颜色页的纯函数（不依赖 Vue / i18n）：
 *
 * - CSS 命名色搜索：索引颜色中文名、英文名、简写（CSS 关键字）与 HEX；
 *   搜索词忽略大小写与 HEX 前缀 `#`，支持 `#rgb` / `#rrggbb` 的包含匹配。
 * - 网页安全色筛选：R / G / B 三个通道各自可选「任意」或网页安全色六档
 *   （00 / 33 / 66 / 99 / cc / ff），三个通道同时生效。
 *
 * 颜色名由调用方读取 i18n 后传入（names），保证这个模块可以直接被单元测试使用。
 */

/** 网页安全色每个通道的 6 档取值 */
export const WEB_SAFE_LEVELS = ['00', '33', '66', '99', 'cc', 'ff'] as const

/** 网页安全色的单通道档位 */
export type WebSafeLevel = (typeof WEB_SAFE_LEVELS)[number]

/** 单通道筛选值：'any' 表示该通道不筛选 */
export type WebSafeFilterValue = 'any' | WebSafeLevel

/** R / G / B 三通道的筛选条件 */
export interface WebSafeRgbFilter {
  r: WebSafeFilterValue
  g: WebSafeFilterValue
  b: WebSafeFilterValue
}

/** 参与搜索需要的最小字段集 */
export interface ColorSearchEntry {
  /** 简写（CSS 关键字），如 'red' */
  shorthand: string
  /** 十六进制色值（可带 `#`、大小写不限） */
  hex: string
  /** 颜色名索引：中英文各一条，由调用方从 i18n 读取 */
  names: readonly string[]
}

/** 默认筛选：三个通道都是「任意」（不过滤） */
export function defaultWebSafeFilter(): WebSafeRgbFilter {
  return { r: 'any', g: 'any', b: 'any' }
}

/** 校验单通道筛选值，非法值回退「任意」 */
export function isWebSafeFilterValue(value: unknown): value is WebSafeFilterValue {
  return (
    value === 'any' ||
    (typeof value === 'string' && (WEB_SAFE_LEVELS as readonly string[]).includes(value))
  )
}

/** 是否设置了至少一个筛选条件（用于「重置筛选」按钮的禁用态） */
export function isWebSafeFilterActive(filter: WebSafeRgbFilter): boolean {
  return filter.r !== 'any' || filter.g !== 'any' || filter.b !== 'any'
}

/** 归一化搜索词：去首尾空白、转小写、去掉 HEX 前缀 `#` */
export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase().replace(/^#+/, '')
}

/** 3 位 HEX 展开成 6 位（`f00` → `ff0000`），其它长度原样返回 */
function expandHex(hex: string): string {
  if (hex.length !== 3) return hex
  return hex
    .split('')
    .map((char) => char + char)
    .join('')
}

/**
 * 单张颜色卡片是否命中搜索词：
 * - 空搜索词命中全部；
 * - 中文名 / 英文名 / 简写：忽略大小写的包含匹配；
 * - HEX：忽略大小写与 `#` 的包含匹配，3 位输入再按展开后的 6 位匹配一次
 *   （`#f00` 可以搜到 `#ff0000`）。
 */
export function matchesColorSearch(entry: ColorSearchEntry, query: string): boolean {
  const keyword = normalizeSearchQuery(query)
  if (keyword === '') return true

  if (entry.shorthand.trim().toLowerCase().includes(keyword)) return true
  if (entry.names.some((name) => name.trim().toLowerCase().includes(keyword))) return true

  const hex = entry.hex.trim().toLowerCase().replace(/^#+/, '')
  if (hex === '') return false
  return hex.includes(keyword) || (keyword.length === 3 && hex.includes(expandHex(keyword)))
}

/** 按搜索词过滤卡片（保持原顺序，空搜索词返回全部） */
export function filterBySearch<T extends ColorSearchEntry>(
  items: readonly T[],
  query: string,
): T[] {
  return items.filter((item) => matchesColorSearch(item, query))
}

/** 单个 6 位 HEX 是否满足三通道筛选（值为 'any' 的通道不限制） */
export function matchesWebSafeFilter(hex: string, filter: WebSafeRgbFilter): boolean {
  const value = hex.trim().toLowerCase().replace(/^#+/, '')
  if (!/^[0-9a-f]{6}$/.test(value)) return false
  return (
    (filter.r === 'any' || value.slice(0, 2) === filter.r) &&
    (filter.g === 'any' || value.slice(2, 4) === filter.g) &&
    (filter.b === 'any' || value.slice(4, 6) === filter.b)
  )
}

/** 按 R / G / B 筛选条件过滤颜色（保持原顺序，全「任意」返回全部） */
export function filterWebSafeColors<T extends { hex: string }>(
  items: readonly T[],
  filter: WebSafeRgbFilter,
): T[] {
  return items.filter((item) => matchesWebSafeFilter(item.hex, filter))
}
