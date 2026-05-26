import { Account, MonthlyProfit } from '@/types'

// 货币配置（从 account-form.tsx 提取）
const CURRENCY_CONFIG = {
  CNY: { symbol: '¥', label: '人民币' },
  USD: { symbol: '$', label: '美元' },
  EUR: { symbol: '€', label: '欧元' },
  HKD: { symbol: 'HK$', label: '港币' },
  JPY: { symbol: '¥', label: '日元' },
} as const

// 货币收益统计接口
export interface CurrencyProfitStatistics {
  currency: string
  symbol: string
  totalProfit: number
  profitRate: number
  accountProfits: {
    accountId: string
    accountName: string
    profit: number
    startBalance: number
    profitRate?: number
  }[]
  hasData: boolean
}

/**
 * 按货币分组计算收益
 * 基于 calculateMonthlyProfits 的结果，将收益按货币分组
 */
export function calculateProfitsByCurrency(
  monthlyProfits: MonthlyProfit[],
  accounts: Account[]
): Record<string, CurrencyProfitStatistics> {
  // 创建账户ID到货币的映射
  const accountCurrencyMap = new Map(accounts.map(a => [a.id, a.currency]))

  // 按货币分组收益数据
  const profitsByCurrency = monthlyProfits.reduce((acc, profit) => {
    const currency = accountCurrencyMap.get(profit.accountId)
    if (!currency) return acc

    if (!acc[currency]) {
      const config = CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG] || {
        symbol: currency,
        label: currency
      }
      acc[currency] = {
        currency,
        symbol: config.symbol,
        totalProfit: 0,
        profitRate: 0,
        accountProfits: [],
        hasData: false,
      }
    }

    // 累加收益
    acc[currency].totalProfit += profit.calculatedProfit
    acc[currency].accountProfits.push({
      accountId: profit.accountId,
      accountName: profit.accountName,
      profit: profit.calculatedProfit,
      startBalance: profit.startBalance,
      profitRate: profit.profitRate,
    })
    acc[currency].hasData = true

    return acc
  }, {} as Record<string, CurrencyProfitStatistics>)

  // 计算每种货币的加权平均收益率
  Object.keys(profitsByCurrency).forEach(currency => {
    const stats = profitsByCurrency[currency]
    const totalStartBalance = stats.accountProfits.reduce(
      (sum, p) => sum + p.startBalance,
      0
    )

    stats.profitRate = totalStartBalance > 0
      ? stats.accountProfits.reduce((sum, p) => {
          const weight = p.startBalance / totalStartBalance
          return sum + (p.profitRate || 0) * weight
        }, 0)
      : 0
  })

  return profitsByCurrency
}
