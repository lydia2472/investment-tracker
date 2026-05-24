/**
 * Animal Crossing 颜色映射工具
 * 统一的颜色管理，支持语义化和官方调色板
 */

export const acnhColors = {
  // NookPhone 官方 13 色
  nookphone: {
    default: 'rgb(247,243,223)',   // 默认背景
    appPink: '#f8a6b2',            // 粉色应用
    purple: '#b77dee',             // 紫色应用
    appBlue: '#889df0',            // 蓝色应用
    appYellow: '#f7cd67',          // 黄色应用（铃钱）
    appOrange: '#e59266',          // 橙色应用
    appTeal: '#82d5bb',            // 青色应用
    appGreen: '#8ac68a',           // 绿色应用
    appRed: '#fc736d',             // 红色应用
    limeGreen: '#d1da49',          // 青柠绿
    yellowGreen: '#ecdf52',        // 黄绿色
    brown: '#9a835a',              // 棕色
    warmPeachPink: '#e18c6f',      // 温暖桃粉
  },

  // 语义化映射（游戏内含义）
  semantic: {
    profit: '#5ec850',      // 萝卜绿（盈利）
    loss: '#ff6464',        // 烂萝卜红（亏损）
    bells: '#d4b030',       // 铃钱金
    shell: '#e6b842',       // 贝壳黄
    acorn: '#c49944',       // 橡果棕
    leaf: '#7bc96a',        // 叶子绿
  },

  // UI 状态色
  status: {
    success: '#6fba2c',     // 成功绿
    warning: '#f5c31c',     // 警告黄
    error: '#e05a5a',       // 错误红
    info: '#889df0',        // 信息蓝
  },
} as const

/**
 * 获取 Tailwind 背景类（用于动态样式）
 */
export function getBgColor(colorKey: keyof typeof acnhColors.semantic): string {
  return acnhColors.semantic[colorKey]
}

/**
 * 获取 NookPhone 应用颜色
 */
export function getNookPhoneColor(colorKey: keyof typeof acnhColors.nookphone): string {
  return acnhColors.nookphone[colorKey]
}

/**
 * 获取带透明度的背景色
 */
export function getBgColorWithOpacity(
  colorKey: keyof typeof acnhColors.semantic,
  opacity: number
): string {
  const hex = acnhColors.semantic[colorKey]
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * 颜色名称映射（用于 StatsCard 等组件）
 */
export const variantToColorKey: Record<string, keyof typeof acnhColors.nookphone> = {
  gold: 'appYellow',
  green: 'appGreen',
  blue: 'appBlue',
  red: 'appRed',
  pink: 'warmPeachPink',
  purple: 'purple',
  teal: 'appTeal',
  orange: 'appOrange',
} as const
