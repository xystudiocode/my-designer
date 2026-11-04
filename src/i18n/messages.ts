import type { LocaleCode } from '@/stores/locale'

/** 中文文案为基准，en 必须覆盖全部 key，遗漏会在类型检查时报错 */
const zhCN = {
  'app.documentTitle': 'XyStudio 的设计器',
  'app.title': 'XyStudio 的设计器',
  'app.subtitle': '实用 · 设计',

  'nav.workspace': '工作台',
  'nav.about': '关于',

  'language.selectorLabel': '界面语言',
  'language.browserSettings': '浏览器设置',

  'home.listTitle': 'My Designer 设计器列表',
  'home.listSubtitle': '请在下方选择一个工具打开。',

  'cards.open': '打开',
  'cards.previewAlt': '{name} 的预览图 {index}',

  'card.colorPicker.title': '颜色预览',
  'card.colorPicker.description': '通过丰富的色域选择、“配色助手” 快速栏，快速制作软件配色',

  'colorPicker.title': '颜色选择器',
  'colorPicker.mode': '选择模式：',
  'colorPicker.red': '红',
  'colorPicker.green': '绿',
  'colorPicker.blue': '蓝',
  'colorPicker.alpha': '不透明度',
  'colorPicker.selectColor': '选择颜色',
  'colorPicker.colorConversion': '颜色转换',
  'colorPicker.hue': '色相',
  'colorPicker.saturation': '饱和度',
  'colorPicker.lightness': '亮度',
  'colorPicker.displayColor': '显示颜色',
  'colorPicker.assistant': '配色助手',
  'colorPicker.assistantHint': '点击可获取颜色信息。',
  'colorPicker.byLightness': '基于亮度信息：',
  'colorPicker.allLightness': '所有亮度配色信息：',
  'colorPicker.copy': '复制',
  'colorPicker.copied': '已复制',
  'colorPicker.unsupportedMode': '该模式暂未实现',

  'lightbox.close': '关闭',
  'lightbox.prev': '上一张',
  'lightbox.next': '下一张',

  'about.title': '关于本项目',
  'about.intro': '由 create-vue 官方模板初始化，并按需集成了常用生态依赖。',
  'about.stack': '技术栈',
  'about.structure': '目录结构',
  'about.col.dependency': '依赖',
  'about.col.usage': '用途',
  'about.col.path': '路径',
  'about.col.description': '说明',
  'about.dep.vue': '核心框架，组合式 API + setup 语法',
  'about.dep.vueRouter': 'SPA 路由，history 模式',
  'about.dep.pinia': '全局状态管理，stores 目录',
  'about.dep.elementPlus': 'UI 组件库，按需自动引入并支持中英文 locale',
  'about.dep.tailwind': '原子化 CSS，经 @tailwindcss/vite 插件接入',
  'about.src.main': '应用入口：注册 Pinia、Router（Element Plus 按需引入）',
  'about.src.app': '根组件与整体布局',
  'about.src.router': '路由表',
  'about.src.stores': 'Pinia 状态模块',
  'about.src.views': '页面级组件',
  'about.src.components': '可复用组件',
  'about.src.css': 'Tailwind 入口与全局样式',
} as const

export type MessageKey = keyof typeof zhCN

const en: Record<MessageKey, string> = {
  'app.documentTitle': 'XyStudio Designer',
  'app.title': 'XyStudio Designer',
  'app.subtitle': 'Practical · Design',

  'nav.workspace': 'Workspace',
  'nav.about': 'About',

  'language.selectorLabel': 'Language',
  'language.browserSettings': 'Browser settings',

  'home.listTitle': 'My Designer Tools',
  'home.listSubtitle': 'Pick a tool below to open it.',

  'card.colorPicker.title': 'Color Preview',
  'card.colorPicker.description':
    'Quickly create software color schemes through a wide color palette and the "Color Assistant" quick bar.',

  'colorPicker.title': 'Color Picker',
  'colorPicker.mode': 'Mode: ',
  'colorPicker.red': 'Red',
  'colorPicker.green': 'Green',
  'colorPicker.blue': 'Blue',
  'colorPicker.alpha': 'Opacity',
  'colorPicker.selectColor': 'Select color',
  'colorPicker.colorConversion': 'Color conversion',
  'colorPicker.hue': 'Hue',
  'colorPicker.saturation': 'Saturation',
  'colorPicker.lightness': 'Lightness',
  'colorPicker.displayColor': 'Display color',
  'colorPicker.assistant': 'Color assistant',
  'colorPicker.assistantHint': 'Click to get color information.',
  'colorPicker.byLightness': 'Based on lightness:',
  'colorPicker.allLightness': 'All lightness values:',
  'colorPicker.copy': 'Copy',
  'colorPicker.copied': 'Copied',
  'colorPicker.unsupportedMode': 'This mode is not implemented yet',

  'cards.open': 'Open',
  'cards.previewAlt': 'Preview {index} of {name}',

  'lightbox.close': 'Close',
  'lightbox.prev': 'Previous',
  'lightbox.next': 'Next',

  'about.title': 'About this project',
  'about.intro':
    'Initialized from the official create-vue template with common ecosystem dependencies integrated.',
  'about.stack': 'Tech stack',
  'about.structure': 'Directory structure',
  'about.col.dependency': 'Dependency',
  'about.col.usage': 'Usage',
  'about.col.path': 'Path',
  'about.col.description': 'Description',
  'about.dep.vue': 'Core framework with Composition API and setup syntax',
  'about.dep.vueRouter': 'SPA routing in history mode',
  'about.dep.pinia': 'Global state management, stores directory',
  'about.dep.elementPlus': 'UI component library, imported on demand with zh/en locales',
  'about.dep.tailwind': 'Atomic CSS, integrated via the @tailwindcss/vite plugin',
  'about.src.main': 'App entry: registers Pinia and Router (Element Plus on demand)',
  'about.src.app': 'Root component and overall layout',
  'about.src.router': 'Route table',
  'about.src.stores': 'Pinia store modules',
  'about.src.views': 'Page-level components',
  'about.src.components': 'Reusable components',
  'about.src.css': 'Tailwind entry and global styles',
}

export const messages: Record<LocaleCode, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
  en,
}
