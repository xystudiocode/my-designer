import { describe, expect, it } from 'vitest'
import { messages, type MessageKey } from '@/i18n/messages'

/** 中文为基准语言，其它语言必须覆盖它的全部 key */
const BASE_LOCALE = 'zh-CN' as const
const baseKeys = Object.keys(messages[BASE_LOCALE]) as MessageKey[]
const localeCodes = ['zh-CN', 'en'] as const

/** 取出 `{name}` 这类插值占位符，用于校验中英文是否一致 */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1] ?? '').sort()
}

describe('i18n messages', () => {
  it('英文覆盖中文基准的全部 key', () => {
    expect(Object.keys(messages.en).sort()).toEqual([...baseKeys].sort())
  })

  it('每个语言的所有文案都非空', () => {
    for (const locale of localeCodes) {
      for (const key of baseKeys) {
        const text = messages[locale][key] ?? ''
        expect(text.trim(), `${locale} 的 ${key} 不能为空`).not.toBe('')
      }
    }
  })

  it('中英文文案的插值占位符保持一致', () => {
    for (const key of baseKeys) {
      expect(placeholders(messages.en[key] ?? ''), `${key} 的占位符不一致`).toEqual(
        placeholders(messages[BASE_LOCALE][key] ?? ''),
      )
    }
  })
})
