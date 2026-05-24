/**
 * 语义化设计类
 * 统一的类名组合，用于替代硬编码的 Tailwind 类组合
 */

export const cardClasses = {
  base: 'rounded-md border bg-card shadow-sm transition-all duration-normal',
  hover: 'hover:shadow-md hover:-translate-y-1',
  interactive: 'cursor-pointer hover:scale-[1.02]',
  withAnimation: 'transition-all duration-normal',
} as const

export const iconClasses = {
  container: 'h-10 w-10 rounded-xl p-2 shadow-lg transition-all duration-normal',
  hover: 'group-hover:scale-110 group-hover:rotate-3',
  containerSm: 'h-8 w-8 rounded-lg p-1.5 shadow-md transition-all duration-normal',
  containerLg: 'h-12 w-12 rounded-2xl p-3 shadow-xl transition-all duration-normal',
} as const

export const buttonClasses = {
  primary: 'rounded-pill bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-hover transition-all duration-fast',
  secondary: 'rounded-pill bg-secondary px-6 py-3 font-semibold text-secondary-foreground hover:bg-secondary-hover transition-all duration-fast',
  interactive: 'transition-all duration-fast hover:scale-105 active:scale-95',
} as const

export const animationClasses = {
  cardHover: 'transition-all duration-300 hover:translate-y-[-2px]',
  iconHover: 'transition-all duration-normal group-hover:scale-110 group-hover:rotate-3',
  fadeIn: 'animate-in fade-in duration-normal',
  slideIn: 'animate-in slide-in-from-bottom-4 duration-normal',
} as const
