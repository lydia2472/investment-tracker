import { formatCurrencyCompact } from './formatters'

import type { CurrencyStatistics } from '@/types'

/**
 * 获取优先货币（CNY优先，否则返回金额最大的货币）
 *
 * @param currencies - 货币统计数组
 * @param valueExtractor - 提取比较值的函数（如：c => c.totalAssets）
 * @returns 优先货币，如果没有符合条件的货币则返回 undefined
 */
export function getPriorityCurrency<T extends CurrencyStatistics>(
  currencies: T[],
  valueExtractor: (currency: T) => number
): T | undefined {
  if (currencies.length === 0) {
    return undefined
  }

  // 1. 优先查找 CNY（金额必须 > 0）
  const cnyCurrency = currencies.find((c) => c.currency === 'CNY')
  if (cnyCurrency && valueExtractor(cnyCurrency) > 0) {
    return cnyCurrency
  }

  // 2. CNY 无数据或金额为 0，查找金额最大的货币
  const currencyWithMaxValue = currencies
    .filter((c) => valueExtractor(c) > 0)
    .sort((a, b) => valueExtractor(b) - valueExtractor(a))[0]

  return currencyWithMaxValue
}

/**
 * 格式化优先货币的显示文本
 *
 * @param currency - 货币统计对象
 * @param valueExtractor - 提取显示值的函数
 * @param prefix - 前缀符号（如 '+'、'-'、空字符串）
 * @returns 格式化后的显示文本，如 "¥ 10,000" 或 "暂无数据"
 */
export function formatPriorityCurrencyDisplay<T extends CurrencyStatistics>(
  currency: T | undefined,
  valueExtractor: (currency: T) => number,
  prefix: string = ''
): string {
  if (!currency) {
    return '暂无数据'
  }

  const value = valueExtractor(currency)
  if (value <= 0) {
    return '暂无数据'
  }

  return `${prefix}${currency.symbol} ${formatCurrencyCompact(value)}`
}
