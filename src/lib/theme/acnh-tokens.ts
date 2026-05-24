/**
 * ACNH 萝卜投资主题色彩映射
 * 将现有 ACNH 颜色与 animal-island-ui 令牌融合
 */

export const ACNHTokens = {
  // 盈利状态 - 新鲜白萝卜
  profit: {
    primary: '#5ec850',    // 萝卜绿
    gradient: 'linear-gradient(135deg, #5ec850 0%, #7bc96a 100%)',
    glow: '0 0 20px rgba(94, 200, 80, 0.3)',
  },

  // 亏损状态 - 烂萝卜
  loss: {
    primary: '#ff6464',    // 烂萝卜红
    gradient: 'linear-gradient(135deg, #ff6464 0%, #ff3363 100%)',
    glow: '0 0 20px rgba(255, 100, 100, 0.3)',
  },

  // 货币 - 铃钱
  bells: {
    primary: '#d4b030',    // 铃钱金
    gradient: 'linear-gradient(135deg, #d4b030 0%, #e6b842 100%)',
    glow: '0 0 20px rgba(212, 176, 48, 0.3)',
  },

  // 中性 - 动物岛薄荷青
  neutral: {
    primary: '#19c8b9',    // animal-island-ui 主色
    background: '#f8f8f0', // 奶油米白背景
    text: '#794f27',       // 温暖棕色文字
    shadow: '#bdaea0',     // 按钮 3D 阴影
    inputShadow: '#d4c9b4', // 输入框 3D 阴影
    focus: '#ffcc00',      // 焦点黄（禁止蓝色）
  },
} as const

/**
 * 获取语义颜色类名
 */
export function getSemanticColorClass(state: 'profit' | 'loss' | 'bells' | 'neutral'): string {
  const colorMap = {
    profit: 'bg-gradient-profit turnip-glow',
    loss: 'bg-gradient-loss',
    bells: 'bg-gradient-bells bells-glow',
    neutral: '',
  }
  return colorMap[state]
}

/**
 * 映射 Button variant 到 animal-island-ui type
 */
export function mapButtonType(variant: string): { type: string; className?: string } {
  const variantMap: Record<string, { type: string; className?: string }> = {
    default: { type: 'primary', className: 'bg-[#5ec850]' },
    destructive: { type: 'primary', className: 'bg-[#ff6464]' },
    profit: { type: 'primary', className: 'bg-gradient-profit turnip-glow' },
    bells: { type: 'default', className: 'bg-gradient-bells bells-glow' },
    loss: { type: 'primary', className: 'bg-gradient-loss' },
    leaf: { type: 'default', className: 'bg-gradient-to-r from-[#7bc96a] to-[#5ec850]' },
    diy: { type: 'dashed', className: 'diy-paper' },
    outline: { type: 'default', className: 'border-2 border-[#5ec850]/50' },
    secondary: { type: 'default', className: 'bg-slate-100' },
    ghost: { type: 'default', className: 'hover:bg-muted/50' },
    link: { type: 'link', className: '' },
    glass: { type: 'default', className: 'glass' },
  }

  return variantMap[variant] || variantMap.default
}

/**
 * 映射 Card variant 到 animal-island-ui color
 */
export function mapCardColor(variant: string): string {
  const colorMap: Record<string, string> = {
    profit: 'app-green',
    loss: 'app-red',
    bells: 'app-yellow',
    default: 'app-blue',
    diy: 'app-pink',
  }

  return colorMap[variant] || colorMap.default
}
