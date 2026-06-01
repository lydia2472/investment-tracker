/**
 * 设计令牌配置
 * 统一的设计系统常量，映射到 Tailwind CSS
 */

export const designTokens = {
  borderRadius: {
    sm: '12px', // 卡片小组件
    md: '18px', // 标准卡片
    lg: '24px', // 大卡片/模态框
    pill: '50px', // 按钮/输入框（胶囊形状）
  },

  spacing: {
    card: '24px', // 卡片内边距
    section: '16px', // 区块间距
    element: '12px', // 元素间距
  },

  shadow: {
    card: '0 2px 8px rgba(115, 93, 66, 0.1)',
    hover: '0 8px 16px rgba(115, 93, 66, 0.15)',
    glow: '0 0 20px rgba(94, 200, 80, 0.3)',
    glowProfit: '0 0 20px rgba(94, 200, 80, 0.3)',
    glowBells: '0 0 20px rgba(212, 176, 48, 0.3)',
  },

  transition: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
  },

  scale: {
    hover: '1.02',
    interactive: '1.05',
    icon: '1.1',
  },
} as const
