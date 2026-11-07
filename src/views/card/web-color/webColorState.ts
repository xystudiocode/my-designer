/**
 * 网页颜色页的用户设置持久化（纯函数，不依赖 Vue）：
 *
 * 只记住「显示模式」（CSS 命名色 / 网页安全色），再次进入页面时恢复上次选择。
 * 读写全部包在 try/catch 里：隐私模式 / 存储被禁用时退回默认值，不阻塞页面。
 */

/** 显示模式：CSS 命名色 / 网页安全色 */
export type WebColorMode = 'css' | 'websafe'

/** 网页颜色页需要记住的用户设置 */
export interface WebColorSettings {
  mode: WebColorMode
}

/** 与浏览器 localStorage 对齐的最小接口，方便单元测试注入内存实现 */
export interface WebColorStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** 本地存储 key；改 key 相当于清空网页颜色页的偏好 */
export const WEB_COLOR_STORAGE_KEY = 'my-designer:web-color'

/** 默认显示 CSS 命名色（需求：默认 CSS 配色） */
export const DEFAULT_WEB_COLOR_MODE: WebColorMode = 'css'

export function isWebColorMode(value: unknown): value is WebColorMode {
  return value === 'css' || value === 'websafe'
}

export function createDefaultWebColorSettings(): WebColorSettings {
  return { mode: DEFAULT_WEB_COLOR_MODE }
}

/** 把任意来源（localStorage / 旧版本数据）的值收敛成合法设置；非法项回退默认值 */
export function sanitizeWebColorSettings(value: unknown): WebColorSettings {
  const fallback = createDefaultWebColorSettings()
  if (!value || typeof value !== 'object') return fallback
  const record = value as Record<string, unknown>
  return isWebColorMode(record.mode) ? { mode: record.mode } : fallback
}

/** 默认 localStorage；不可用时返回 null（如 SSR / 隐私模式） */
export function resolveDefaultWebColorStorage(): WebColorStorage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

export function loadWebColorSettings(
  storage: WebColorStorage | null = resolveDefaultWebColorStorage(),
): WebColorSettings {
  if (!storage) return createDefaultWebColorSettings()
  let raw: string | null = null
  try {
    raw = storage.getItem(WEB_COLOR_STORAGE_KEY)
  } catch {
    return createDefaultWebColorSettings()
  }
  if (!raw) return createDefaultWebColorSettings()
  try {
    return sanitizeWebColorSettings(JSON.parse(raw))
  } catch {
    return createDefaultWebColorSettings()
  }
}

export function saveWebColorSettings(
  settings: WebColorSettings,
  storage: WebColorStorage | null = resolveDefaultWebColorStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(WEB_COLOR_STORAGE_KEY, JSON.stringify({ mode: settings.mode }))
  } catch {
    // 存储写满 / 被禁用时忽略：只在当前会话生效
  }
}
