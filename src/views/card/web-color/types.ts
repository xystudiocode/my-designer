/**
 * 网页颜色页的卡片数据类型（纯类型声明，不依赖 Vue）。
 *
 * 数据由页面（web-color.vue）统一构建并完成搜索 / 筛选，
 * CSSColor.vue 与 WebSafeColor.vue 只负责把筛选后的数据渲染成 CardGrid + ColorCard。
 */
import type { ColorFormat, RgbColor } from '@/views/card/color-picker/color'

/** CSS 命名色卡片数据 */
export interface CssColorItem {
  /** CSS 关键字 / 简写，如 'red'、'lightgoldenrodyellow' */
  shorthand: string
  /** 当前语言下的颜色名（用于卡片展示） */
  name: string
  /** 搜索用名称索引：中英文各一条（搜索始终中英文都可用） */
  names: readonly string[]
  /** 十六进制色值；透明色为 CSS 关键字 'transparent' */
  hex: string
  /** sRGB 0-255（透明色固定为 0,0,0） */
  rgb: RgbColor
  /** 不透明度 0-100（透明色为 0） */
  alpha: number
  /** 在颜色选择器中打开时使用的模式 */
  mode: ColorFormat
  transparent: boolean
}

/** 网页安全色卡片数据 */
export interface WebSafeColorItem {
  /** 6 位十六进制（带 #） */
  hex: string
  /** sRGB 0-255 */
  rgb: RgbColor
}
