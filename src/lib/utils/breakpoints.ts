/**
 * 响应式断点配置
 * 统一的响应式设计标准
 */

export const breakpoints = {
  sm: '640px', // 移动端（大屏手机）
  md: '768px', // 平板（竖屏）
  lg: '1024px', // 平板（横屏）/ 小笔记本
  xl: '1280px', // 桌面
  '2xl': '1536px', // 大屏桌面
} as const

export type Breakpoint = keyof typeof breakpoints

/**
 * 响应式工具类
 */
export const responsive = {
  // 卡片网格布局
  cardGrid: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',

  // 表格文字大小
  table: 'text-xs sm:text-sm md:text-base',

  // 内边距
  padding: 'p-4 sm:p-6 md:p-8',

  // 间距
  gap: 'gap-2 sm:gap-4 md:gap-6',
} as const

// 侧边栏配置（单独导出）
export const sidebarResponsive = {
  mobile: 'hidden',
  desktop: 'w-72',
  tablet: 'w-64',
} as const

/**
 * 获取响应式类名
 */
export function getResponsiveClasses(component: keyof typeof responsive): string {
  return responsive[component]
}

/**
 * 媒体查询工具函数（用于 JS 条件判断）
 */
export const mediaQuery = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const

/**
 * 检测当前断点（客户端使用）
 */
export function getCurrentBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'sm'

  const width = window.innerWidth
  if (width >= 1536) return '2xl'
  if (width >= 1280) return 'xl'
  if (width >= 1024) return 'lg'
  if (width >= 768) return 'md'
  return 'sm'
}
