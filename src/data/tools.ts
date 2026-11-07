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
  /** 「打开」按钮跳转的目标路径 */
  to: string
}

/** 卡片静态定义：title/desc 走 i18n，icon 既支持 path d 也支持完整 <svg> 代码 */
export interface ToolCardDefinition {
  id: string
  titleKey: MessageKey
  descKey: MessageKey
  icon: string
  previews: string[]
  /** 「打开」按钮跳转的目标路径，必须在 src/router/index.ts 中注册（如 '/card/color-picker'） */
  to: string
}

const previewModules = import.meta.glob<string>('../assets/tools/previews/colorPicker*.png', {
  eager: true,
  import: 'default',
})

const webColorPreviewModules = import.meta.glob<string>('../assets/tools/previews/webColor*.png', {
  eager: true,
  import: 'default',
})

/** 按文件名自然排序后取值,并过滤掉 undefined */
function sortedPreviews(modules: Record<string, string>): string[] {
  return Object.keys(modules)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((key) => modules[key])
    .filter((src): src is string => typeof src === 'string')
}

// 按文件名自然排序后取值,并过滤掉 undefined
const colorPickerPreviews: string[] = sortedPreviews(previewModules)
const webColorPreviews: string[] = sortedPreviews(webColorPreviewModules)

export const toolCardDefinitions: ToolCardDefinition[] = [
  {
    id: 'color-picker',
    titleKey: 'card.colorPicker.title',
    descKey: 'card.colorPicker.desc',
    to: '/card/color-picker',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" color="currentcolor" role="img">  <title>Paint palette (mono)</title>  <defs>    <!-- keeps the palette outline clear where the brush passes in front -->    <mask id="ppm-brush-gap" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">      <rect width="32" height="32" fill="#fff"/>      <path d="M 24.4 3.8 A 1.6 1.6 0 0 1 27.6 3.8 C 27.72 9.4 27.49 15.2 27.45 19.2 C 27.57 19.5 27.98 19.75 27.98 20.22 L 27.98 22.6 C 27.99 22.75 28.24 23.15 28.24 23.75 C 27.89 26.2 27.3 28.2 25.55 29.5 C 24.6 28 24.06 26 23.76 23.75 C 23.76 23.15 24.01 22.75 24.02 22.6 L 24.02 20.22 C 24.02 19.75 24.43 19.5 24.55 19.2 C 24.51 15.2 24.28 9.4 24.4 3.8 Z" fill="#000" stroke="#000" stroke-width="3" stroke-linejoin="round" transform="rotate(5.5 26 15.6)"/>    </mask>  </defs>  <!-- palette: outline only, one ink colour (inherits currentColor) -->  <g id="ppm-palette" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">    <path d="M 3.922 20.13 A 12.9 12.9 0 1 1 11.26 27.598 Q 10.345 27.194 10.245 26.199 L 9.884 22.593 Q 9.795 21.698 8.901 21.593 L 5.302 21.169 Q 4.309 21.052 3.922 20.13 Z" mask="url(#ppm-brush-gap)"/>    <!-- five paint dabs -->    <circle cx="13.2" cy="7.2" r="1.45"/>    <circle cx="19.8" cy="9.2" r="1.45"/>    <circle cx="8.4" cy="13.4" r="1.45"/>    <circle cx="12.4" cy="20.4" r="1.45"/>    <circle cx="18" cy="22.2" r="1.45"/>  </g>  <!-- brush: handle / ferrule / bristles -->  <g id="ppm-brush" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" transform="rotate(5.5 26 15.6)">    <path d="M 24.4 3.8 A 1.6 1.6 0 0 1 27.6 3.8 C 27.72 9.4 27.49 15.2 27.45 19.2 C 27.57 19.5 27.98 19.75 27.98 20.22 L 27.98 22.6 C 27.99 22.75 28.24 23.15 28.24 23.75 C 27.89 26.2 27.3 28.2 25.55 29.5 C 24.6 28 24.06 26 23.76 23.75 C 23.76 23.15 24.01 22.75 24.02 22.6 L 24.02 20.22 C 24.02 19.75 24.43 19.5 24.55 19.2 C 24.51 15.2 24.28 9.4 24.4 3.8 Z"/>    <path d="M 24.55 19.2 L 27.45 19.2"/>    <path d="M 24.02 22.6 L 27.98 22.6"/>    <path d="M 25.9 24.2 C 25.75 25.4 25.6 27 25.55 28.8"/>  </g></svg>',
    previews: colorPickerPreviews,
  },
  {
    id: 'web-color',
    titleKey: 'card.webColor.title',
    descKey: 'card.webColor.desc',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Web colours: fanned colour swatch cards"> <title>Web colours</title> <g transform="translate(21.26384 31.51751)"> <g transform="rotate(-20)"> <rect x="-10" y="-26" width="20" height="36" rx="8" ry="8" fill="#fff"/> <circle cx="0" cy="-16" r="2.4" fill="currentColor" stroke="none"/> </g> <g transform="rotate(0)"> <rect x="-10" y="-26" width="20" height="36" rx="8" ry="8" fill="#fff"/> <circle cx="0" cy="-16" r="2.4" fill="currentColor" stroke="none"/> </g> <g transform="rotate(20)"> <rect x="-10" y="-26" width="20" height="36" rx="8" ry="8" fill="#fff"/> <circle cx="0" cy="-16" r="2.4" fill="currentColor" stroke="none"/> </g> </g></svg>',
    previews: webColorPreviews,
    to: '/card/web-color',
  },
]
