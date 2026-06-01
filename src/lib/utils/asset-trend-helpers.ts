import { MonthlyProfit , Account } from '@/types'

export interface AssetTrendPoint {
  date: string // "2024年1月"
  dateKey: string // "2024-01" - 用于排序
  [key: string]: string | number | undefined // 支持动态货币键
}

/**
 * 从月度收益数据提取各币种资产趋势
 * @param monthlyProfits - 月度收益数据
 * @param accounts - 账户列表
 * @param dateRange - 可选日期筛选
 * @returns 资产趋势数据数组
 */
export function calculateAssetTrend(
  monthlyProfits: MonthlyProfit[],
  accounts: Account[],
  dateRange?: { startDate?: Date; endDate?: Date }
): AssetTrendPoint[] {
  // 1. 构建账户到货币的映射
  const accountCurrencyMap = new Map(accounts.map((a) => [a.id, a.currency]))

  // 2. 按月份和货币分组月末余额
  const monthlyCurrencyBalances = new Map<string, Map<string, number>>()

  monthlyProfits.forEach((profit) => {
    const currency = accountCurrencyMap.get(profit.accountId)
    if (!currency) return

    const monthKey = `${profit.year}-${String(profit.month).padStart(2, '0')}`

    if (!monthlyCurrencyBalances.has(monthKey)) {
      monthlyCurrencyBalances.set(monthKey, new Map())
    }

    const currencyMap = monthlyCurrencyBalances.get(monthKey)!
    currencyMap.set(currency, (currencyMap.get(currency) || 0) + profit.endBalance)
  })

  // 3. 转换为图表数据格式
  const trendData: AssetTrendPoint[] = []
  const allCurrencies = new Set<string>()

  // 收集所有货币
  monthlyCurrencyBalances.forEach((currencyMap) => {
    currencyMap.forEach((_, currency) => allCurrencies.add(currency))
  })

  // 生成数据点
  monthlyCurrencyBalances.forEach((currencyMap, monthKey) => {
    // 日期筛选
    if (dateRange?.startDate || dateRange?.endDate) {
      const [year, month] = monthKey.split('-').map(Number)
      const monthDate = new Date(year, month - 1)

      if (dateRange.startDate && monthDate < dateRange.startDate) return
      if (dateRange.endDate && monthDate > dateRange.endDate) return
    }

    const point: AssetTrendPoint = {
      date: `${monthKey.split('-')[0]}年${monthKey.split('-')[1]}月`,
      dateKey: monthKey,
    }

    // 填充各币种资产
    allCurrencies.forEach((currency) => {
      point[currency] = currencyMap.get(currency) || 0
    })

    trendData.push(point)
  })

  // 按日期排序
  return trendData.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

/**
 * 获取货币颜色配置
 */
export function getCurrencyColor(currency: string): string {
  const colors: Record<string, string> = {
    CNY: '#16a34a', // green-700
    USD: '#2563eb', // blue-600
    EUR: '#7c3aed', // violet-600
    HKD: '#ea580c', // orange-600
    JPY: '#db2777', // pink-600
  }
  return colors[currency] || '#6b7280' // gray-500 default
}
