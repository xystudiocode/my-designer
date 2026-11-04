import { describe, expect, it } from 'vitest'
import { toolCardDefinitions } from '@/data/tools'
import { messages } from '@/i18n/messages'

describe('toolCardDefinitions', () => {
  it('至少有一张卡片（避免空数组时其余断言空转）', () => {
    expect(toolCardDefinitions.length).toBeGreaterThan(0)
  })

  it('id 唯一', () => {
    const ids = toolCardDefinitions.map((card) => card.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('titleKey / descKey 在中英文里都有非空文案', () => {
    for (const card of toolCardDefinitions) {
      for (const locale of ['zh-CN', 'en'] as const) {
        const title = messages[locale][card.titleKey] ?? ''
        const desc = messages[locale][card.descKey] ?? ''
        expect(title.trim(), `${locale} 缺少 ${card.titleKey}`).not.toBe('')
        expect(desc.trim(), `${locale} 缺少 ${card.descKey}`).not.toBe('')
      }
    }
  })

  it('icon 非空', () => {
    for (const card of toolCardDefinitions) {
      expect(card.icon.trim(), `${card.id} 的 icon 为空`).not.toBe('')
    }
  })

  it('每张卡片的 to 是以 / 开头的站内路径', () => {
    for (const card of toolCardDefinitions) {
      expect(card.to, `${card.id} 的 to 为空`).toMatch(/^\/[\w\-/]*$/)
    }
  })

  it('每张卡片至少一张可用的预览图', () => {
    for (const card of toolCardDefinitions) {
      expect(card.previews.length, `${card.id} 没有预览图`).toBeGreaterThan(0)
      for (const preview of card.previews) {
        expect(typeof preview, `${card.id} 的预览图路径不是字符串`).toBe('string')
        expect(preview.length, `${card.id} 的预览图路径为空`).toBeGreaterThan(0)
      }
    }
  })
})
