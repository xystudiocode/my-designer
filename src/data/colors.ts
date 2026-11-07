import type { MessageKey } from '@/i18n/messages'

/**
 * 卡片运行时数据（与任务约定的结构一致）：
 * { title, desc, icon: 'svg 路径或直接 svg 代码', previews: ['预览图路径', ...] }
 */
export interface ColorCardData {
  title: string
  shorthand: string
  color: string
}

/** 卡片静态定义：title/desc 走 i18n，icon 既支持 path d 也支持完整 <svg> 代码 */
export interface ColorCardDefinition {
  titleKey: MessageKey
  shorthand: string
  color: string
}

function generateWebSafeColors(): string[] {
  const LEVELS = ['00', '33', '66', '99', 'cc', 'ff']
  const colors = []

  for (const r of LEVELS) {
    for (const g of LEVELS) {
      for (const b of LEVELS) {
        const hex = `#${r}${g}${b}`
        colors.push(hex)
      }
    }
  }
  return colors
}

export const toolCardDefinitions: ColorCardDefinition[] = [
  { shorthand: 'aqua', color: '#00ffff', titleKey: 'webColor.colors.css.aqua' },
  { shorthand: 'aliceblue', color: '#f0f8ff', titleKey: 'webColor.colors.css.aliceblue' },
  { shorthand: 'antiquewhite', color: '#faebd7', titleKey: 'webColor.colors.css.antiquewhite' },
  { shorthand: 'aqua', color: '#00ffff', titleKey: 'webColor.colors.css.aqua' },
  { shorthand: 'aquamarine', color: '#7fffd4', titleKey: 'webColor.colors.css.aquamarine' },
  { shorthand: 'azure', color: '#f0ffff', titleKey: 'webColor.colors.css.azure' },
  { shorthand: 'beige', color: '#f5f5dc', titleKey: 'webColor.colors.css.beige' },
  { shorthand: 'bisque', color: '#ffe4c4', titleKey: 'webColor.colors.css.bisque' },
  { shorthand: 'black', color: '#000000', titleKey: 'webColor.colors.css.black' },
  { shorthand: 'blanchedalmond', color: '#ffebcd', titleKey: 'webColor.colors.css.blanchedalmond' },
  { shorthand: 'blue', color: '#0000ff', titleKey: 'webColor.colors.css.blue' },
  { shorthand: 'blueviolet', color: '#8a2be2', titleKey: 'webColor.colors.css.blueviolet' },
  { shorthand: 'brown', color: '#a52a2a', titleKey: 'webColor.colors.css.brown' },
  { shorthand: 'burlywood', color: '#deb887', titleKey: 'webColor.colors.css.burlywood' },
  { shorthand: 'cadetblue', color: '#5f9ea0', titleKey: 'webColor.colors.css.cadetblue' },
  { shorthand: 'chartreuse', color: '#7fff00', titleKey: 'webColor.colors.css.chartreuse' },
  { shorthand: 'chocolate', color: '#d2691e', titleKey: 'webColor.colors.css.chocolate' },
  { shorthand: 'coral', color: '#ff7f50', titleKey: 'webColor.colors.css.coral' },
  { shorthand: 'cornflowerblue', color: '#6495ed', titleKey: 'webColor.colors.css.cornflowerblue' },
  { shorthand: 'cornsilk', color: '#fff8dc', titleKey: 'webColor.colors.css.cornsilk' },
  { shorthand: 'crimson', color: '#dc143c', titleKey: 'webColor.colors.css.crimson' },
  { shorthand: 'cyan', color: '#00ffff', titleKey: 'webColor.colors.css.cyan' },
  { shorthand: 'darkblue', color: '#00008b', titleKey: 'webColor.colors.css.darkblue' },
  { shorthand: 'darkcyan', color: '#008b8b', titleKey: 'webColor.colors.css.darkcyan' },
  { shorthand: 'darkgoldenrod', color: '#b8860b', titleKey: 'webColor.colors.css.darkgoldenrod' },
  { shorthand: 'darkgray', color: '#a9a9a9', titleKey: 'webColor.colors.css.darkgray' },
  { shorthand: 'darkgreen', color: '#006400', titleKey: 'webColor.colors.css.darkgreen' },
  { shorthand: 'darkgrey', color: '#a9a9a9', titleKey: 'webColor.colors.css.darkgrey' },
  { shorthand: 'darkkhaki', color: '#bdb76b', titleKey: 'webColor.colors.css.darkkhaki' },
  { shorthand: 'darkmagenta', color: '#8b008b', titleKey: 'webColor.colors.css.darkmagenta' },
  { shorthand: 'darkolivegreen', color: '#556b2f', titleKey: 'webColor.colors.css.darkolivegreen' },
  { shorthand: 'darkorange', color: '#ff8c00', titleKey: 'webColor.colors.css.darkorange' },
  { shorthand: 'darkorchid', color: '#9932cc', titleKey: 'webColor.colors.css.darkorchid' },
  { shorthand: 'darkred', color: '#8b0000', titleKey: 'webColor.colors.css.darkred' },
  { shorthand: 'darksalmon', color: '#e9967a', titleKey: 'webColor.colors.css.darksalmon' },
  { shorthand: 'darkseagreen', color: '#8fbc8f', titleKey: 'webColor.colors.css.darkseagreen' },
  { shorthand: 'darkslateblue', color: '#483d8b', titleKey: 'webColor.colors.css.darkslateblue' },
  { shorthand: 'darkslategray', color: '#2f4f4f', titleKey: 'webColor.colors.css.darkslategray' },
  { shorthand: 'darkslategrey', color: '#2f4f4f', titleKey: 'webColor.colors.css.darkslategrey' },
  { shorthand: 'darkturquoise', color: '#00ced1', titleKey: 'webColor.colors.css.darkturquoise' },
  { shorthand: 'darkviolet', color: '#9400d3', titleKey: 'webColor.colors.css.darkviolet' },
  { shorthand: 'deeppink', color: '#ff1493', titleKey: 'webColor.colors.css.deeppink' },
  { shorthand: 'deepskyblue', color: '#00bfff', titleKey: 'webColor.colors.css.deepskyblue' },
  { shorthand: 'dimgray', color: '#696969', titleKey: 'webColor.colors.css.dimgray' },
  { shorthand: 'dimgrey', color: '#696969', titleKey: 'webColor.colors.css.dimgrey' },
  { shorthand: 'dodgerblue', color: '#1e90ff', titleKey: 'webColor.colors.css.dodgerblue' },
  { shorthand: 'firebrick', color: '#b22222', titleKey: 'webColor.colors.css.firebrick' },
  { shorthand: 'floralwhite', color: '#fffaf0', titleKey: 'webColor.colors.css.floralwhite' },
  { shorthand: 'forestgreen', color: '#228b22', titleKey: 'webColor.colors.css.forestgreen' },
  { shorthand: 'fuchsia', color: '#ff00ff', titleKey: 'webColor.colors.css.fuchsia' },
  { shorthand: 'gainsboro', color: '#dcdcdc', titleKey: 'webColor.colors.css.gainsboro' },
  { shorthand: 'ghostwhite', color: '#f8f8ff', titleKey: 'webColor.colors.css.ghostwhite' },
  { shorthand: 'gold', color: '#ffd700', titleKey: 'webColor.colors.css.gold' },
  { shorthand: 'goldenrod', color: '#daa520', titleKey: 'webColor.colors.css.goldenrod' },
  { shorthand: 'gray', color: '#808080', titleKey: 'webColor.colors.css.gray' },
  { shorthand: 'green', color: '#008000', titleKey: 'webColor.colors.css.green' },
  { shorthand: 'greenyellow', color: '#adff2f', titleKey: 'webColor.colors.css.greenyellow' },
  { shorthand: 'grey', color: '#808080', titleKey: 'webColor.colors.css.grey' },
  { shorthand: 'honeydew', color: '#f0fff0', titleKey: 'webColor.colors.css.honeydew' },
  { shorthand: 'hotpink', color: '#ff69b4', titleKey: 'webColor.colors.css.hotpink' },
  { shorthand: 'indianred', color: '#cd5c5c', titleKey: 'webColor.colors.css.indianred' },
  { shorthand: 'indigo', color: '#4b0082', titleKey: 'webColor.colors.css.indigo' },
  { shorthand: 'ivory', color: '#fffff0', titleKey: 'webColor.colors.css.ivory' },
  { shorthand: 'khaki', color: '#f0e68c', titleKey: 'webColor.colors.css.khaki' },
  { shorthand: 'lavender', color: '#e6e6fa', titleKey: 'webColor.colors.css.lavender' },
  { shorthand: 'lavenderblush', color: '#fff0f5', titleKey: 'webColor.colors.css.lavenderblush' },
  { shorthand: 'lawngreen', color: '#7cfc00', titleKey: 'webColor.colors.css.lawngreen' },
  { shorthand: 'lemonchiffon', color: '#fffacd', titleKey: 'webColor.colors.css.lemonchiffon' },
  { shorthand: 'lightblue', color: '#add8e6', titleKey: 'webColor.colors.css.lightblue' },
  { shorthand: 'lightcoral', color: '#f08080', titleKey: 'webColor.colors.css.lightcoral' },
  { shorthand: 'lightcyan', color: '#e0ffff', titleKey: 'webColor.colors.css.lightcyan' },
  {
    shorthand: 'lightgoldenrodyellow',
    color: '#fafad2',
    titleKey: 'webColor.colors.css.lightgoldenrodyellow',
  },
  { shorthand: 'lightgray', color: '#d3d3d3', titleKey: 'webColor.colors.css.lightgray' },
  { shorthand: 'lightgreen', color: '#90ee90', titleKey: 'webColor.colors.css.lightgreen' },
  { shorthand: 'lightgrey', color: '#d3d3d3', titleKey: 'webColor.colors.css.lightgrey' },
  { shorthand: 'lightpink', color: '#ffb6c1', titleKey: 'webColor.colors.css.lightpink' },
  { shorthand: 'lightsalmon', color: '#ffa07a', titleKey: 'webColor.colors.css.lightsalmon' },
  { shorthand: 'lightseagreen', color: '#20b2aa', titleKey: 'webColor.colors.css.lightseagreen' },
  { shorthand: 'lightskyblue', color: '#87cefa', titleKey: 'webColor.colors.css.lightskyblue' },
  { shorthand: 'lightslategray', color: '#778899', titleKey: 'webColor.colors.css.lightslategray' },
  { shorthand: 'lightslategrey', color: '#778899', titleKey: 'webColor.colors.css.lightslategrey' },
  { shorthand: 'lightsteelblue', color: '#b0c4de', titleKey: 'webColor.colors.css.lightsteelblue' },
  { shorthand: 'lightyellow', color: '#ffffe0', titleKey: 'webColor.colors.css.lightyellow' },
  { shorthand: 'lime', color: '#00ff00', titleKey: 'webColor.colors.css.lime' },
  { shorthand: 'limegreen', color: '#32cd32', titleKey: 'webColor.colors.css.limegreen' },
  { shorthand: 'linen', color: '#faf0e6', titleKey: 'webColor.colors.css.linen' },
  { shorthand: 'magenta', color: '#ff00ff', titleKey: 'webColor.colors.css.magenta' },
  { shorthand: 'maroon', color: '#800000', titleKey: 'webColor.colors.css.maroon' },
  {
    shorthand: 'mediumaquamarine',
    color: '#66cdaa',
    titleKey: 'webColor.colors.css.mediumaquamarine',
  },
  { shorthand: 'mediumblue', color: '#0000cd', titleKey: 'webColor.colors.css.mediumblue' },
  { shorthand: 'mediumorchid', color: '#ba55d3', titleKey: 'webColor.colors.css.mediumorchid' },
  { shorthand: 'mediumpurple', color: '#9370db', titleKey: 'webColor.colors.css.mediumpurple' },
  { shorthand: 'mediumseagreen', color: '#3cb371', titleKey: 'webColor.colors.css.mediumseagreen' },
  {
    shorthand: 'mediumslateblue',
    color: '#7b68ee',
    titleKey: 'webColor.colors.css.mediumslateblue',
  },
  {
    shorthand: 'mediumspringgreen',
    color: '#00fa9a',
    titleKey: 'webColor.colors.css.mediumspringgreen',
  },
  {
    shorthand: 'mediumturquoise',
    color: '#48d1cc',
    titleKey: 'webColor.colors.css.mediumturquoise',
  },
  {
    shorthand: 'mediumvioletred',
    color: '#c71585',
    titleKey: 'webColor.colors.css.mediumvioletred',
  },
  { shorthand: 'midnightblue', color: '#191970', titleKey: 'webColor.colors.css.midnightblue' },
  { shorthand: 'mintcream', color: '#f5fffa', titleKey: 'webColor.colors.css.mintcream' },
  { shorthand: 'mistyrose', color: '#ffe4e1', titleKey: 'webColor.colors.css.mistyrose' },
  { shorthand: 'moccasin', color: '#ffe4b5', titleKey: 'webColor.colors.css.moccasin' },
  { shorthand: 'navajowhite', color: '#ffdead', titleKey: 'webColor.colors.css.navajowhite' },
  { shorthand: 'navy', color: '#000080', titleKey: 'webColor.colors.css.navy' },
  { shorthand: 'oldlace', color: '#fdf5e6', titleKey: 'webColor.colors.css.oldlace' },
  { shorthand: 'olive', color: '#808000', titleKey: 'webColor.colors.css.olive' },
  { shorthand: 'olivedrab', color: '#6b8e23', titleKey: 'webColor.colors.css.olivedrab' },
  { shorthand: 'orange', color: '#ffa500', titleKey: 'webColor.colors.css.orange' },
  { shorthand: 'orangered', color: '#ff4500', titleKey: 'webColor.colors.css.orangered' },
  { shorthand: 'orchid', color: '#da70d6', titleKey: 'webColor.colors.css.orchid' },
  { shorthand: 'palegoldenrod', color: '#eee8aa', titleKey: 'webColor.colors.css.palegoldenrod' },
  { shorthand: 'palegreen', color: '#98fb98', titleKey: 'webColor.colors.css.palegreen' },
  { shorthand: 'paleturquoise', color: '#afeeee', titleKey: 'webColor.colors.css.paleturquoise' },
  { shorthand: 'palevioletred', color: '#db7093', titleKey: 'webColor.colors.css.palevioletred' },
  { shorthand: 'papayawhip', color: '#ffefd5', titleKey: 'webColor.colors.css.papayawhip' },
  { shorthand: 'peachpuff', color: '#ffdab9', titleKey: 'webColor.colors.css.peachpuff' },
  { shorthand: 'peru', color: '#cd853f', titleKey: 'webColor.colors.css.peru' },
  { shorthand: 'pink', color: '#ffc0cb', titleKey: 'webColor.colors.css.pink' },
  { shorthand: 'plum', color: '#dda0dd', titleKey: 'webColor.colors.css.plum' },
  { shorthand: 'powderblue', color: '#b0e0e6', titleKey: 'webColor.colors.css.powderblue' },
  { shorthand: 'purple', color: '#800080', titleKey: 'webColor.colors.css.purple' },
  { shorthand: 'rebeccapurple', color: '#663399', titleKey: 'webColor.colors.css.rebeccapurple' },
  { shorthand: 'red', color: '#ff0000', titleKey: 'webColor.colors.css.red' },
  { shorthand: 'rosybrown', color: '#bc8f8f', titleKey: 'webColor.colors.css.rosybrown' },
  { shorthand: 'royalblue', color: '#4169e1', titleKey: 'webColor.colors.css.royalblue' },
  { shorthand: 'saddlebrown', color: '#8b4513', titleKey: 'webColor.colors.css.saddlebrown' },
  { shorthand: 'salmon', color: '#fa8072', titleKey: 'webColor.colors.css.salmon' },
  { shorthand: 'sandybrown', color: '#f4a460', titleKey: 'webColor.colors.css.sandybrown' },
  { shorthand: 'seagreen', color: '#2e8b57', titleKey: 'webColor.colors.css.seagreen' },
  { shorthand: 'seashell', color: '#fff5ee', titleKey: 'webColor.colors.css.seashell' },
  { shorthand: 'sienna', color: '#a0522d', titleKey: 'webColor.colors.css.sienna' },
  { shorthand: 'silver', color: '#c0c0c0', titleKey: 'webColor.colors.css.silver' },
  { shorthand: 'skyblue', color: '#87ceeb', titleKey: 'webColor.colors.css.skyblue' },
  { shorthand: 'slateblue', color: '#6a5acd', titleKey: 'webColor.colors.css.slateblue' },
  { shorthand: 'slategray', color: '#708090', titleKey: 'webColor.colors.css.slategray' },
  { shorthand: 'slategrey', color: '#708090', titleKey: 'webColor.colors.css.slategrey' },
  { shorthand: 'snow', color: '#fffafa', titleKey: 'webColor.colors.css.snow' },
  { shorthand: 'springgreen', color: '#00ff7f', titleKey: 'webColor.colors.css.springgreen' },
  { shorthand: 'steelblue', color: '#4682b4', titleKey: 'webColor.colors.css.steelblue' },
  { shorthand: 'tan', color: '#d2b48c', titleKey: 'webColor.colors.css.tan' },
  { shorthand: 'teal', color: '#008080', titleKey: 'webColor.colors.css.teal' },
  { shorthand: 'thistle', color: '#d8bfd8', titleKey: 'webColor.colors.css.thistle' },
  { shorthand: 'tomato', color: '#ff6347', titleKey: 'webColor.colors.css.tomato' },
  { shorthand: 'transparent', color: 'transparent', titleKey: 'webColor.colors.css.transparent' },
  { shorthand: 'turquoise', color: '#40e0d0', titleKey: 'webColor.colors.css.turquoise' },
  { shorthand: 'violet', color: '#ee82ee', titleKey: 'webColor.colors.css.violet' },
  { shorthand: 'wheat', color: '#f5deb3', titleKey: 'webColor.colors.css.wheat' },
  { shorthand: 'white', color: '#ffffff', titleKey: 'webColor.colors.css.white' },
  { shorthand: 'whitesmoke', color: '#f5f5f5', titleKey: 'webColor.colors.css.whitesmoke' },
  { shorthand: 'yellow', color: '#ffff00', titleKey: 'webColor.colors.css.yellow' },
  { shorthand: 'yellowgreen', color: '#9acd32', titleKey: 'webColor.colors.css.yellowgreen' },
]

export const webSafeColors: string[] = generateWebSafeColors()
