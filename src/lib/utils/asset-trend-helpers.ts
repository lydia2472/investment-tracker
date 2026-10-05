import { endOfMonth } from 'date-fns'

import { calculateAccountBalanceFromTransactions } from '@/lib/utils/account-balance-helpers'
import { MonthlyProfit, Account, Transaction } from '@/types'
import type { Snapshot as SnapshotType } from '@/lib/stores/snapshot-store'

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
 * @param snapshots - 可选的快照数据（用于获取准确的资产余额）
 * @returns 资产趋势数据数组
 */
export function calculateAssetTrend(
  monthlyProfits: MonthlyProfit[],
  accounts: Account[],
  transactions: Transaction[],
  dateRange?: { startDate?: Date; endDate?: Date },
  snapshots?: SnapshotType[]
): AssetTrendPoint[] {
  // 调试：显示账户类型分布
  const accountTypeCount = accounts.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // 1. 构建账户到货币的映射
  const accountCurrencyMap = new Map(accounts.map((a) => [a.id, a.currency]))

  // 2. 如果提供了快照数据，从快照构建资产趋势
  if (snapshots && snapshots.length > 0) {
    // 先过滤：只保留当前存在的账户的快照
    const validAccountIds = new Set(accounts.map(a => a.id))
    const validSnapshots = snapshots.filter(s => validAccountIds.has(s.accountId))

    // 按账户和月份分组，每个账户每个月只保留最后一个快照
    const accountMonthSnapshots = new Map<string, Map<string, { balance: number; timestamp: number }>>()

    // 收集所有涉及的月份
    const allMonths = new Set<string>()

    // 收集所有有快照的账户ID
    const accountsWithSnapshots = new Set<string>()

    validSnapshots.forEach((snapshot) => {
      const snapshotDate = new Date(snapshot.snapshotDate)
      const monthKey = `${snapshotDate.getFullYear()}-${String(snapshotDate.getMonth() + 1).padStart(2, '0')}`
      const timestamp = snapshotDate.getTime()

      allMonths.add(monthKey)
      accountsWithSnapshots.add(snapshot.accountId)

      if (!accountMonthSnapshots.has(snapshot.accountId)) {
        accountMonthSnapshots.set(snapshot.accountId, new Map())
      }

      const monthMap = accountMonthSnapshots.get(snapshot.accountId)!

      // 只保留该月最后一个快照（时间戳最大的）
      const existing = monthMap.get(monthKey)
      if (!existing || timestamp > existing.timestamp) {
        monthMap.set(monthKey, { balance: snapshot.balance, timestamp })
      }
    })

    // 对于没有快照的账户，在所有月份使用当前余额
    const accountsWithoutSnapshots = accounts.filter(a => !accountsWithSnapshots.has(a.id))
    console.log('无快照账户数:', accountsWithoutSnapshots.length)
    console.log('无快照账户:', accountsWithoutSnapshots.map(a => ({ name: a.name, type: a.type, balance: a.balance })))

    // 为无快照的账户添加当前余额到所有月份
    const sortedMonths = Array.from(allMonths).sort()

    accountsWithoutSnapshots.forEach(account => {
      const currency = accountCurrencyMap.get(account.id)
      if (!currency) return

      sortedMonths.forEach(monthKey => {
        if (!accountMonthSnapshots.has(account.id)) {
          accountMonthSnapshots.set(account.id, new Map())
        }

        const monthMap = accountMonthSnapshots.get(account.id)!
        const [year, month] = monthKey.split('-').map(Number)
        const monthEndDate = endOfMonth(new Date(year, month - 1, 1))
        const balanceAtMonthEnd = calculateAccountBalanceFromTransactions(
          account,
          transactions,
          monthEndDate
        )

        monthMap.set(monthKey, { balance: balanceAtMonthEnd, timestamp: monthEndDate.getTime() })
      })
    })

    // 按月份和货币汇总，使用向前填充
    const monthlyCurrencyBalances = new Map<string, Map<string, number>>()

    // 对每个账户，向前填充缺失的月份
    accountMonthSnapshots.forEach((monthMap, accountId) => {
      const currency = accountCurrencyMap.get(accountId)
      if (!currency) return

      // 获取所有排序后的月份
      const sortedMonths = Array.from(allMonths).sort()

      let lastBalance: number | undefined

      sortedMonths.forEach((monthKey) => {
        // 如果该月有快照，更新 lastBalance
        if (monthMap.has(monthKey)) {
          lastBalance = monthMap.get(monthKey)!.balance
        }

        // 如果有 lastBalance（该月或之前的快照），则累加到该月
        if (lastBalance !== undefined) {
          if (!monthlyCurrencyBalances.has(monthKey)) {
            monthlyCurrencyBalances.set(monthKey, new Map())
          }

          const currencyMap = monthlyCurrencyBalances.get(monthKey)!
          currencyMap.set(currency, (currencyMap.get(currency) || 0) + lastBalance)
        }
      })
    })

    // 转换为图表数据格式
    const trendData: AssetTrendPoint[] = []
    const allCurrencies = new Set<string>()

    // 调试：输出计算结果
    console.log('========== 趋势图计算调试 ==========')
    console.log('传入账户数:', accounts.length)
    console.log('账户类型分布:', accountTypeCount)
    console.log('总快照数:', snapshots.length)
    console.log('过滤后快照数:', validSnapshots.length)
    console.log('涉及月份:', Array.from(allMonths).sort())
    console.log('账户数量:', accountMonthSnapshots.size)

    monthlyCurrencyBalances.forEach((currencyMap) => {
      currencyMap.forEach((_, currency) => allCurrencies.add(currency))
    })

    console.log('货币月度汇总:')
    monthlyCurrencyBalances.forEach((currencyMap, monthKey) => {
      const summary: Record<string, number> = {}
      currencyMap.forEach((balance, currency) => {
        summary[currency] = balance
      })
      console.log(`  ${monthKey}:`, summary)
    })

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

      allCurrencies.forEach((currency) => {
        point[currency] = currencyMap.get(currency) || 0
      })

      trendData.push(point)
    })

    return trendData.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }

  // 3. 降级逻辑：如果没有快照，使用 monthlyProfits 数据
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

  // 4. 转换为图表数据格式（降级逻辑）
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
