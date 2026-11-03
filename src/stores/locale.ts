import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/** 当前支持的具体语言；展示时使用母语原文，不做翻译 */
export type LocaleCode = 'zh-CN' | 'en'

/** 语言偏好：某个具体语言，或跟随浏览器（「浏览器设置」） */
export type LocalePreference = LocaleCode | 'browser'

export interface LanguageOption {
  value: LocaleCode
  label: string
}

/** 语言选项：语言名固定为母语原文，顺序与设计图一致 */
export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
]

/** 默认跟随浏览器 */
const DEFAULT_PREFERENCE: LocalePreference = 'browser'

/** 语言偏好在 localStorage 中的 key */
const STORAGE_KEY = 'my-designer:locale'

const FALLBACK_LOCALE: LocaleCode = 'en'

/** 取 BCP 47 语言主标签：zh-CN → zh、en-US → en */
function primarySubtag(language: string): string {
  return language.toLowerCase().split('-')[0] || FALLBACK_LOCALE
}

/** 读取浏览器语言；SSR / 测试等没有 navigator 的环境回退英文 */
function readBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return FALLBACK_LOCALE
  return navigator.language || navigator.languages?.[0] || FALLBACK_LOCALE
}

/** 把任意语言标签匹配到当前支持的具体语言 */
function matchSupportedLocale(language: string): LocaleCode | undefined {
  const primary = primarySubtag(language)
  return LANGUAGE_OPTIONS.find((option) => primarySubtag(option.value) === primary)?.value
}

/** 校验存储值是否是合法的语言偏好（防止旧版本或手改数据） */
function isLocalePreference(value: string | null): value is LocalePreference {
  if (!value) return false
  return value === 'browser' || LANGUAGE_OPTIONS.some((option) => option.value === value)
}

/** 读取上次保存的语言偏好；无记录或不可用时回退「跟随浏览器」 */
function readStoredPreference(): LocalePreference {
  if (typeof localStorage === 'undefined') return DEFAULT_PREFERENCE
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isLocalePreference(stored) ? stored : DEFAULT_PREFERENCE
  } catch {
    // 隐私模式等场景下 localStorage 不可用，忽略即可
    return DEFAULT_PREFERENCE
  }
}

function storePreference(preference: LocalePreference) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // 写入失败（如存储被禁用）不影响当前会话
  }
}

export const useLocaleStore = defineStore('locale', () => {
  /** 浏览器语言只在 store 创建时读取一次 */
  const browserLanguage = ref(readBrowserLanguage())

  /** 用户选择的语言偏好：默认「跟随浏览器」，并优先使用上次保存的选择 */
  const preference = ref<LocalePreference>(readStoredPreference())

  /** 实际生效的语言；选择「浏览器设置」时按浏览器语言匹配，未收录时回退英文 */
  const resolvedLocale = computed<LocaleCode>(() => {
    if (preference.value !== 'browser') return preference.value
    return matchSupportedLocale(browserLanguage.value) ?? FALLBACK_LOCALE
  })

  /** 切换语言并保存，下次打开页面时恢复 */
  function setPreference(next: LocalePreference) {
    preference.value = next
    storePreference(next)
  }

  return {
    browserLanguage,
    preference,
    resolvedLocale,
    setPreference,
  }
})
