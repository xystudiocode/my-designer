import { computed } from 'vue'
import { useLocaleStore } from '@/stores/locale'
import { messages, type MessageKey } from './messages'

export type MessageParams = Record<string, string | number>

export type Translate = (key: MessageKey, params?: MessageParams) => string

/**
 * 极简响应式 i18n：文案直接取自当前生效语言，
 * 切换语言时组件重新求值即可更新，无需刷新页面。
 */
export function useI18n() {
  const localeStore = useLocaleStore()

  const t: Translate = (key, params) => {
    let text = messages[localeStore.resolvedLocale][key]
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value))
      }
    }
    return text
  }

  const locale = computed(() => localeStore.resolvedLocale)

  return { t, locale }
}
