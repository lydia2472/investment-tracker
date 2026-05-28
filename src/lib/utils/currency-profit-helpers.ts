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
  // 筛选指定月份的收益数据
  const filteredProfits = (() => {
    // 1. 优先：如果有日期范围，按日期范围筛选
    if (dateRange?.startDate && dateRange?.endDate) {
      return monthlyProfits.filter(p => {
        // 创建月份第一天和最后一天
        const monthFirstDay = new Date(p.year, p.month - 1, 1)
        const monthLastDay = new Date(p.year, p.month, 0)
        // 判断月份区间是否与日期范围有交集
        return monthFirstDay <= dateRange.endDate! && monthLastDay >= dateRange.startDate!
      })
    }

    // 2. 其次：按年月筛选（或返回全部）
    return selectedYear && selectedMonth
      ? monthlyProfits.filter(p => p.year === selectedYear && p.month === selectedMonth)
      : monthlyProfits
  })()

  // 创建账户ID到货币的映射
  const accountCurrencyMap = new Map(accounts.map(a => [a.id, a.currency]))

  // 按货币分组收益数据
  const profitsByCurrency = filteredProfits.reduce((acc, profit) => {
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

    // 增强的货币收益累加日志
    console.log(`\n[货币收益累加] ${currency}`)
    console.log(`  账户: ${profit.accountName} (ID: ${profit.accountId})`)
    console.log(`  年月: ${profit.year}-${String(profit.month).padStart(2, '0')}`)
    console.log(`  上月期末快照: ${profit.startBalance.toFixed(2)}`)
    console.log(`  本月期末快照: ${profit.endBalance.toFixed(2)}`)
    console.log(`  期间转入: ${(profit.endBalance - profit.startBalance - profit.calculatedProfit).toFixed(2)}`)
    console.log(`  本月收益: ${profit.calculatedProfit.toFixed(2)}`)
    console.log(`  收益率: ${profit.profitRate?.toFixed(2) || 'N/A'}%`)
    console.log(`  ${currency}累计总收益: ${acc[currency].totalProfit.toFixed(2)}`)
    console.log(`  ----------------------------------------`)

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

  // 显示最终汇总
  console.log(`\n========== 收益汇总 ==========`)
  Object.keys(profitsByCurrency).forEach(currency => {
    const stats = profitsByCurrency[currency]
    console.log(`${currency}: ${stats.symbol} ${stats.totalProfit.toFixed(2)}`)
    console.log(`  加权收益率: ${stats.profitRate.toFixed(2)}%`)
    console.log(`  账户数量: ${stats.accountProfits.length}`)
  })
  console.log(`================================\n`)

  // 显示计算公式说明
  console.log(`========== 各货币收益计算公式 ==========`)
  console.log(`单月收益 = 本月期末快照 - 上月期末快照 - 本月转入`)
  console.log(`总收益 = Σ(该货币所有账户的月度收益)`)
  console.log(`加权收益率 = Σ(单个账户收益率 × 该账户上月期末快照权重)`)
  console.log(`==========================================\n`)

  // 显示最新月份的货币收益汇总
  if (monthlyProfits.length > 0) {
    const latestProfit = monthlyProfits[monthlyProfits.length - 1]
    const latestYear = latestProfit.year
    const latestMonth = latestProfit.month

    console.log(`========== ${latestYear}年${latestMonth}月 各货币收益 ==========`)
    Object.keys(profitsByCurrency).forEach(currency => {
      const stats = profitsByCurrency[currency]
      // 筛选该货币在最新月份的账户收益
      const latestMonthCurrencyProfits = stats.accountProfits.filter((ap) => {
        const profit = monthlyProfits.find(p =>
          p.accountId === ap.accountId &&
          p.year === latestYear &&
          p.month === latestMonth
        )
        return !!profit
      })

      if (latestMonthCurrencyProfits.length > 0) {
        const currencyMonthProfit = latestMonthCurrencyProfits.reduce((sum, ap) => sum + ap.profit, 0)
        console.log(`${currency}: ${stats.symbol} ${currencyMonthProfit.toFixed(2)}`)
        console.log(`  账户数: ${latestMonthCurrencyProfits.length}`)
      }
    })
    console.log(`========================================================\n`)
  }

  return profitsByCurrency
}
