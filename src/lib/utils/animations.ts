/**
 * 统一的动画工具类
 * 标准化动画效果、过渡时间和缓动函数
 */

export const animations = {
  // 卡片悬停效果
  cardHover: 'transition-all duration-normal hover:-translate-y-1 hover:shadow-md',
  cardHoverLift: 'transition-all duration-normal hover:translate-y-[-4px] hover:shadow-lg',

  // 图标容器效果
  iconHover: 'transition-all duration-normal group-hover:scale-110 group-hover:rotate-3',
  iconHoverScale: 'transition-all duration-normal group-hover:scale-110',

  // 按钮效果
  buttonHover: 'transition-all duration-fast hover:scale-105 active:scale-95',
  buttonPress: 'transition-all duration-fast active:scale-95',

  // 淡入淡出
  fadeIn: 'animate-in fade-in duration-normal',
  fadeOut: 'animate-out fade-out duration-normal',

  // 滑动
  slideInFromBottom: 'animate-in slide-in-from-bottom-4 duration-normal',
  slideOutToBottom: 'animate-out slide-out-to-bottom-4 duration-normal',

  // 特殊效果
  float: 'animate-float',
  pulseGlow: 'animate-pulse-glow',
} as const

export const animationDurations = {
  fast: 'duration-150',
  normal: 'duration-250',
  slow: 'duration-350',
} as const

export const animationDelays = {
  none: 'delay-0',
  short: 'delay-75',
  normal: 'delay-150',
  long: 'delay-300',
} as const

/**
 * 获取动画类
 */
export function getAnimation(type: keyof typeof animations): string {
  return animations[type]
}
