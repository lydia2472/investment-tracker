import { Account, MonthlyProfit } from '@/types'

import type { DateRange } from '@/components/dashboard/date-filter-bar'

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

export interface ProfitMonthReference {
  year: number
  month: number
}

function getLatestProfitMonth(profits: MonthlyProfit[]): ProfitMonthReference | null {
  if (profits.length === 0) {
    return null
  }

  return profits.reduce<ProfitMonthReference>(
    (latest, profit) => {
      if (
        profit.year > latest.year ||
        (profit.year === latest.year && profit.month > latest.month)
      ) {
        return {
          year: profit.year,
          month: profit.month,
        }
      }

      return latest
    },
    {
      year: profits[0].year,
      month: profits[0].month,
    }
  )
}

export function getProfitReferenceMonth(
  monthlyProfits: MonthlyProfit[],
  accounts: Account[],
  dateRange?: DateRange
): ProfitMonthReference | null {
  const accountCurrencyMap = new Map(accounts.map((a) => [a.id, a.currency]))
  const profits = monthlyProfits.filter((p) => accountCurrencyMap.has(p.accountId))

  if (profits.length === 0 || (dateRange?.startDate && dateRange?.endDate)) {
    return null
  }

  return getLatestProfitMonth(profits)
}

/**
 * 按货币分组计算收益
 * 基于 calculateMonthlyProfits 的结果，将收益按货币分组
 * @param monthlyProfits - 月度收益数据
 * @param accounts - 账户列表
 * @param selectedYear - 选中的年份（可选）
 * @param selectedMonth - 选中的月份（可选）
 * @param dateRange - 日期范围（可选，优先级高于年月选择）
 */
export function calculateProfitsByCurrency(
  monthlyProfits: MonthlyProfit[],
  accounts: Account[],
  selectedYear?: number,
  selectedMonth?: number,
  dateRange?: DateRange
): Record<string, CurrencyProfitStatistics> {
  // 创建账户ID到货币的映射（必须在筛选之前创建）
  const accountCurrencyMap = new Map(accounts.map((a) => [a.id, a.currency]))

  // 筛选指定月份的收益数据
  const filteredProfits = (() => {
    // 先过滤出有效的账户ID（只存在于accounts数组中的记录）
    const profits = monthlyProfits.filter((p) => accountCurrencyMap.has(p.accountId))

    // 1. 优先：如果有日期范围（如"本月"），按日期范围筛选
    if (dateRange?.startDate && dateRange?.endDate) {
      return profits.filter((p) => {
        const monthFirstDay = new Date(p.year, p.month - 1, 1)
        const monthLastDay = new Date(p.year, p.month, 0)
        return monthFirstDay <= dateRange.endDate! && monthLastDay >= dateRange.startDate!
      })
    }

    // 2. 其次：按年月筛选（selectedYear + selectedMonth）
    if (selectedYear && selectedMonth) {
      return profits.filter((p) => p.year === selectedYear && p.month === selectedMonth)
    }

    // 3. 既没有日期范围，也没有指定年月 → "全部"模式：
    //    各货币收益 = 所有月份的投资收益和投资亏损之和（累加全部历史月份）
    return profits
  })()

  // 按货币分组收益数据
  const profitsByCurrency = filteredProfits.reduce(
    (acc, profit) => {
      const currency = accountCurrencyMap.get(profit.accountId)
      if (!currency) return acc

      if (!acc[currency]) {
        const config = CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG] || {
          symbol: currency,
          label: currency,
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
    },
    {} as Record<string, CurrencyProfitStatistics>
  )

  // 计算每种货币的加权平均收益率
  Object.keys(profitsByCurrency).forEach((currency) => {
    const stats = profitsByCurrency[currency]
    const totalStartBalance = stats.accountProfits.reduce((sum, p) => sum + p.startBalance, 0)

    stats.profitRate =
      totalStartBalance > 0
        ? stats.accountProfits.reduce((sum, p) => {
            const weight = p.startBalance / totalStartBalance
            return sum + (p.profitRate || 0) * weight
          }, 0)
        : 0
  })

  return profitsByCurrency
}
