import type { MessageKey } from '@/i18n/messages'

/**
 * 卡片运行时数据（与任务约定的结构一致）：
 * { title, desc, icon: 'svg 路径或直接 svg 代码', previews: ['预览图路径', ...] }
 */
export interface ToolCardData {
  title: string
  desc: string
  icon: string
  previews: string[]
}

/** 卡片静态定义：title/desc 走 i18n，icon 既支持 path d 也支持完整 <svg> 代码 */
export interface ToolCardDefinition {
  id: string
  titleKey: MessageKey
  descKey: MessageKey
  icon: string
  previews: string[]
}

/**
 * 工作台卡片列表（按数组顺序做 Warp 布局）。
 *
 * 目前按要求暂时清空；添加卡片的方法见根目录 use.md，要点：
 * 1. 在这里追加一条 ToolCardDefinition；
 * 2. 在 src/i18n/messages.ts 给 titleKey / descKey 补上中英文文案；
 * 3. 预览图放在 src/assets/tools/previews/ 里后 import 使用。
 *
 * 原 6 张演示卡片的定义仍可从 git 暂存区取回：git show :src/data/tools.ts
 */
export const toolCardDefinitions: ToolCardDefinition[] = []
