export const DEFAULT_TAGS = [
  // 时间相关
  'month-end',
  'quarter-end',
  'year-end',
  'beginning-of-month',
  'mid-month',

  // 交易类别
  'recurring',
  'one-time',
  'bonus',
  'dividend',
  'interest',
  'refund',

  // 状态标记
  'pending',
  'verified',
  'important',
  'review',

  // 投资相关
  'stock',
  'bond',
  'fund',
  'crypto',
  'real-estate',

  // 用途
  'savings',
  'emergency',
  'vacation',
  'education',
  'healthcare',
  'investment',
  'business',
  'personal',
] as const

export type DefaultTag = typeof DEFAULT_TAGS[number]
