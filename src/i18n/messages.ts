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
  'cards.opening': '正在打开「{name}」…',
  'cards.previewAlt': '{name} 的预览图 {index}',

  'lightbox.close': '关闭',
  'lightbox.prev': '上一张',
  'lightbox.next': '下一张',

  'cards.iconStudio.title': '图标工坊',
  'cards.iconStudio.desc':
    '手绘 SVG 图标，支持 32×32 画布与多种描边风格。可一键导出当前选中的图标，也支持把整套图标打包成字体文件，方便在项目里直接引用。',
  'cards.poster.title': '海报生成器',
  'cards.poster.desc':
    '快速拼贴画布，一键导出高清海报与社交媒体配图。内置常用画布尺寸与网格参考线，拖拽素材即可完成排版，并支持导出 PNG / SVG。',
  'cards.palette.title': '配色方案',
  'cards.palette.desc':
    '从图片中提取主色，生成可复用的品牌色板。支持邻近色、互补色自动扩展，并可把色板同步到设计系统，保证多端配色一致。',
  'cards.typography.title': '文字排版',
  'cards.typography.desc':
    '标题与正文的层级排版，支持中英文混排。提供常用字号阶梯与行高预设，快速检查排版节奏，并可直接生成样式变量。',
  'cards.imageTools.title': '图片工具',
  'cards.imageTools.desc':
    '批量压缩、裁剪与格式转换，处理大图更高效。支持 WebP / AVIF 输出与按需缩放，在体积与清晰度之间取得平衡。',
  'cards.layout.title': '布局助手',
  'cards.layout.desc':
    '自动生成 Warp 式瀑布流布局参考，快速完成排版。可调整间距、列宽与断点，并直接复制配置到项目中使用。',

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
  'about.dep.elementPlus': 'UI 组件库，已全局注册并支持中英文 locale',
  'about.dep.tailwind': '原子化 CSS，经 @tailwindcss/vite 插件接入',
  'about.src.main': '应用入口：注册 Pinia、Router、Element Plus',
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

  'cards.open': 'Open',
  'cards.opening': 'Opening “{name}”…',
  'cards.previewAlt': 'Preview {index} of {name}',

  'lightbox.close': 'Close',
  'lightbox.prev': 'Previous',
  'lightbox.next': 'Next',

  'cards.iconStudio.title': 'Icon Studio',
  'cards.iconStudio.desc':
    'Hand-drawn SVG icons on a 32×32 canvas with multiple stroke styles. Export the selected icon or pack the whole set into a font file.',
  'cards.poster.title': 'Poster Maker',
  'cards.poster.desc':
    'Compose posters and export HD social-ready artwork in one click. Preset canvas sizes, grid guides and PNG / SVG export are built in.',
  'cards.palette.title': 'Palette',
  'cards.palette.desc':
    'Extract dominant colors from images and build reusable brand palettes, with analogous and complementary extensions synced to the design system.',
  'cards.typography.title': 'Typography',
  'cards.typography.desc':
    'Type scale and hierarchy for headings and body, with mixed CJK and Latin support. Check the rhythm and generate style variables in one place.',
  'cards.imageTools.title': 'Image Tools',
  'cards.imageTools.desc':
    'Batch compress, crop and convert images to handle large files efficiently, with WebP / AVIF output and on-demand scaling.',
  'cards.layout.title': 'Layout Assistant',
  'cards.layout.desc':
    'Generate Warp-style masonry layouts faster. Tune gaps, column widths and breakpoints, then copy the config into your project.',

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
  'about.dep.elementPlus': 'UI component library, globally registered with zh/en locales',
  'about.dep.tailwind': 'Atomic CSS, integrated via the @tailwindcss/vite plugin',
  'about.src.main': 'App entry: registers Pinia, Router and Element Plus',
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
