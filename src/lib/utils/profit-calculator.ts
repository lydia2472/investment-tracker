import { TransactionType, AccountType, TransactionCategory } from '@/types'
import type { Transaction, Account, MonthlyProfit, SnapshotPair, DashboardProfitSummary, DateRangeProfitSummary } from '@/types'
import {
  endOfMonth,
  startOfMonth,
  isLastDayOfMonth,
  format,
  differenceInMonths,
  addMonths
} from 'date-fns'

/**
 * 判断交易是否为月末快照
 */
export function isMonthEndSnapshot(transaction: Transaction): boolean {
  return (
    transaction.type === TransactionType.SNAPSHOT &&
    (transaction.tags?.includes('month-end') ?? false)
  )
}

/**
 * 查找指定账户的所有月末快照
 * 返回 Map，key 为 "YYYY-MM"，value 为快照交易
 */
export function findMonthEndSnapshots(
  transactions: Transaction[],
  accountId: string
): Map<string, Transaction> {
  const snapshots = transactions.filter(
    (txn) =>
      txn.accountId === accountId &&
      txn.type === TransactionType.SNAPSHOT &&
      (txn.tags?.includes('month-end') ?? false)
  )

  const map = new Map<string, Transaction>()
  snapshots.forEach((snapshot) => {
    const date = snapshot.createdAt instanceof Date
      ? snapshot.createdAt
      : new Date(snapshot.createdAt)
    const key = format(date, 'yyyy-MM')
    map.set(key, snapshot)
  })

  return map
}

/**
 * 获取指定期间内的所有交易（排除快照）
 */
export function getPeriodTransactions(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date,
  accountId: string
): Transaction[] {
  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)

  return transactions.filter((txn) => {
    if (txn.accountId !== accountId) return false

    const txnDate = txn.createdAt instanceof Date
      ? txn.createdAt
      : new Date(txn.createdAt)

    // 排除快照交易
    if (txn.type === TransactionType.SNAPSHOT) return false

    // 排除转账交易（只记录单边）
    if (txn.type === TransactionType.TRANSFER) return false

    return txnDate >= start && txnDate <= end
  })
}

/**
 * 计算指定期间的转入总额
 * 找出所有 TRANSFER_IN 类型的交易并汇总
 */
export function calculateTransferInAmount(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date,
  accountId: string
): number {
  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)

  return transactions
    .filter((txn) => {
      if (txn.accountId !== accountId) return false

      const txnDate = txn.createdAt instanceof Date
        ? txn.createdAt
        : new Date(txn.createdAt)

      // 只统计 TRANSFER_IN 类型的收入交易
      return txn.type === TransactionType.INCOME &&
             txn.category === TransactionCategory.TRANSFER_IN &&
             txnDate >= start &&
             txnDate <= end
    })
    .reduce((sum, txn) => sum + (txn.amount || 0), 0)
}


/**
 * 计算指定快照对的月度收益
 */
export function calculateProfitForPeriod(
  startSnapshot: Transaction,
  endSnapshot: Transaction,
  periodTransactions: Transaction[],
  accountName: string,
  accountType: AccountType,
  allTransactions: Transaction[]  // 新增：完整交易列表，用于计算转入金额
): MonthlyProfit {
  const startDate = startSnapshot.createdAt instanceof Date
    ? startSnapshot.createdAt
    : new Date(startSnapshot.createdAt)
  const endDate = endSnapshot.createdAt instanceof Date
    ? endSnapshot.createdAt
    : new Date(endSnapshot.createdAt)

  const startBalance = startSnapshot.balance || 0
  const endBalance = endSnapshot.balance || 0

  // 根据账户类型应用不同的收益计算公式
  let calculatedProfit: number
  if (accountType === AccountType.CASH) {
    // 现金账户：简化公式（期末 - 期初）
    calculatedProfit = endBalance - startBalance
  } else {
    // 其他账户：扣除转入金额
    const transferInAmount = calculateTransferInAmount(
      allTransactions,
      startDate,
      endDate,
      endSnapshot.accountId
    )
    calculatedProfit = endBalance - startBalance - transferInAmount
  }

  // 计算收益率（处理除零情况）
  const profitRate = startBalance > 0
    ? (calculatedProfit / startBalance) * 100
    : 0

  const periodIncome = periodTransactions
    .filter((txn) => txn.type === TransactionType.INCOME)
    .reduce((sum, txn) => sum + (txn.amount || 0), 0)

  const periodExpense = periodTransactions
    .filter((txn) => txn.type === TransactionType.EXPENSE)
    .reduce((sum, txn) => sum + (txn.amount || 0), 0)

  return {
    year: endDate.getFullYear(),
    month: endDate.getMonth() + 1,
    accountId: endSnapshot.accountId,
    accountName,
    startBalance,
    endBalance,
    calculatedProfit,
    periodIncome,
    periodExpense,
    netFlow: periodIncome - periodExpense,
    profitRate,  // 新增：收益率
    hasCompleteData: true,
    startSnapshotId: startSnapshot.id,
    endSnapshotId: endSnapshot.id,
  }
}

/**
 * 计算所有账户的月度收益
 */
export function calculateMonthlyProfits(
  transactions: Transaction[],
  accounts: Account[]
): MonthlyProfit[] {
  const results: MonthlyProfit[] = []

  // 为每个账户计算月度收益
  accounts.forEach((account) => {
    const accountProfits = calculateAccountMonthlyProfits(
      transactions,
      account
    )
    results.push(...accountProfits)
  })

  // 按年份和月份排序
  return results.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    if (a.month !== b.month) return a.month - b.month
    return a.accountId.localeCompare(b.accountId)
  })
}

/**
 * 计算单个账户的月度收益
 */
export function calculateAccountMonthlyProfits(
  transactions: Transaction[],
  account: Account
): MonthlyProfit[] {
  const profits: MonthlyProfit[] = []

  // 查找该账户的所有月末快照
  const snapshotsMap = findMonthEndSnapshots(transactions, account.id)

  if (snapshotsMap.size === 0) {
    // 没有任何月末快照
    return profits
  }

  // 获取所有已排序的月份
  const sortedMonths = Array.from(snapshotsMap.keys()).sort()

  // 为每个月计算收益
  for (let i = 0; i < sortedMonths.length; i++) {
    const currentMonthKey = sortedMonths[i]
    const currentSnapshot = snapshotsMap.get(currentMonthKey)

    if (!currentSnapshot) continue

    // 如果是第一个月，没有月初快照，跳过
    if (i === 0) {
      continue
    }

    const previousMonthKey = sortedMonths[i - 1]
    const previousSnapshot = snapshotsMap.get(previousMonthKey)

    if (!previousSnapshot) continue

    // 获取期间交易
    const startDate = previousSnapshot.createdAt instanceof Date
      ? previousSnapshot.createdAt
      : new Date(previousSnapshot.createdAt)
    const endDate = currentSnapshot.createdAt instanceof Date
      ? currentSnapshot.createdAt
      : new Date(currentSnapshot.createdAt)

    const periodTransactions = getPeriodTransactions(
      transactions,
      startDate,
      endDate,
      account.id
    )

    // 计算收益（传入完整交易列表和账户类型）
    const profit = calculateProfitForPeriod(
      previousSnapshot,
      currentSnapshot,
      periodTransactions,
      account.name,
      account.type,
      transactions  // 传入完整交易列表用于计算转入金额
    )

    profits.push(profit)
  }

  return profits
}

/**
 * 获取最近的月度收益（用于仪表板摘要）
 */
export function getRecentMonthlyProfits(
  transactions: Transaction[],
  accounts: Account[],
  months: number = 6
): MonthlyProfit[] {
  const allProfits = calculateMonthlyProfits(transactions, accounts)

  // 获取最近的月份
  const now = new Date()
  const cutoffDate = addMonths(now, -months)

  return allProfits.filter((profit) => {
    const profitDate = new Date(profit.year, profit.month - 1)
    return profitDate >= cutoffDate
  })
}

/**
 * 计算总收益（用于仪表板统计）
 */
export function calculateTotalProfit(
  transactions: Transaction[],
  accounts: Account
): number {
  const profits = calculateAccountMonthlyProfits(transactions, accounts)
  return profits.reduce((sum, profit) => sum + profit.calculatedProfit, 0)
}

/**
 * 获取收益最高的月份
 */
export function getBestMonth(
  transactions: Transaction[],
  account: Account
): MonthlyProfit | null {
  const profits = calculateAccountMonthlyProfits(transactions, account)

  if (profits.length === 0) return null

  return profits.reduce((best, current) =>
    current.calculatedProfit > best.calculatedProfit ? current : best
  )
}

/**
 * 获取收益最低的月份
 */
export function getWorstMonth(
  transactions: Transaction[],
  account: Account
): MonthlyProfit | null {
  const profits = calculateAccountMonthlyProfits(transactions, account)

  if (profits.length === 0) return null

  return profits.reduce((worst, current) =>
    current.calculatedProfit < worst.calculatedProfit ? current : worst
  )
}

/**
 * 获取当月收益汇总（用于仪表板显示）
 * @param transactions 所有交易
 * @param accounts 所有账户
 * @param targetMonth 目标月份（默认：当前月份）
 * @param targetYear 目标年份（默认：当前年份）
 */
export function getCurrentMonthProfitSummary(
  transactions: Transaction[],
  accounts: Account[],
  targetMonth?: number,
  targetYear?: number
): DashboardProfitSummary {
  const now = new Date()
  const month = targetMonth ?? now.getMonth() + 1
  const year = targetYear ?? now.getFullYear()

  // 获取所有月度收益
  const allProfits = calculateMonthlyProfits(transactions, accounts)

  // 筛选当月数据
  const currentMonthProfits = allProfits.filter(
    p => p.year === year && p.month === month
  )

  if (currentMonthProfits.length === 0) {
    return {
      totalProfit: 0,
      profitRate: 0,
      hasData: false,
      month,
      year,
    }
  }

  // 计算总收益
  const totalProfit = currentMonthProfits.reduce(
    (sum, p) => sum + p.calculatedProfit,
    0
  )

  // 计算加权平均收益率（按月初余额加权）
  const totalStartBalance = currentMonthProfits.reduce(
    (sum, p) => sum + p.startBalance,
    0
  )

  const weightedProfitRate = totalStartBalance > 0
    ? currentMonthProfits.reduce((sum, p) => {
        const weight = p.startBalance / totalStartBalance
        return sum + (p.profitRate || 0) * weight
      }, 0)
    : 0

  return {
    totalProfit,
    profitRate: weightedProfitRate,
    hasData: true,
    month,
    year,
  }
}

/**
 * 验证日期范围是否有效
 * 结束日期必须晚于或等于开始日期
 */
export function isValidDateRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): boolean {
  const start = new Date(startYear, startMonth - 1)
  const end = new Date(endYear, endMonth - 1)
  return end >= start
}

/**
 * 获取指定日期范围的收益汇总
 * @param transactions 所有交易
 * @param accounts 所有账户
 * @param startYear 起始年份
 * @param startMonth 起始月份
 * @param endYear 结束年份
 * @param endMonth 结束月份
 */
export function getDateRangeProfitSummary(
  transactions: Transaction[],
  accounts: Account[],
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): DateRangeProfitSummary {
  // 获取所有月度收益
  const allProfits = calculateMonthlyProfits(transactions, accounts)

  // 按日期范围过滤
  const filteredProfits = allProfits.filter((profit) => {
    const profitDate = new Date(profit.year, profit.month - 1)
    const startDate = new Date(startYear, startMonth - 1)
    const endDate = new Date(endYear, endMonth - 1)
    return profitDate >= startDate && profitDate <= endDate
  })

  // 按月份聚合（多账户求和）
  const monthlyAggregated = new Map<string, MonthlyProfit>()
  filteredProfits.forEach((profit) => {
    const key = `${profit.year}-${profit.month}`
    if (!monthlyAggregated.has(key)) {
      monthlyAggregated.set(key, { ...profit })
    } else {
      // 多账户月份：累加收益
      const existing = monthlyAggregated.get(key)!
      existing.calculatedProfit += profit.calculatedProfit
      existing.profitRate = profit.profitRate // 使用加权平均
    }
  })

  const monthlyData = Array.from(monthlyAggregated.values())

  if (monthlyData.length === 0) {
    return {
      totalProfit: 0,
      averageProfitRate: 0,
      monthCount: 0,
      startYear,
      startMonth,
      endYear,
      endMonth,
      monthlyData: [],
      hasData: false,
    }
  }

  // 计算总收益
  const totalProfit = monthlyData.reduce((sum, m) => sum + m.calculatedProfit, 0)

  // 计算加权平均收益率
  const totalStartBalance = monthlyData.reduce((sum, m) => sum + m.startBalance, 0)
  const averageProfitRate = totalStartBalance > 0
    ? monthlyData.reduce((sum, m) => {
        const weight = m.startBalance / totalStartBalance
        return sum + (m.profitRate || 0) * weight
      }, 0)
    : 0

  // 找出最佳和最差月份
  const sortedByProfit = [...monthlyData].sort((a, b) => b.calculatedProfit - a.calculatedProfit)
  const bestMonth = sortedByProfit[0]
  const worstMonth = sortedByProfit[sortedByProfit.length - 1]

  return {
    totalProfit,
    averageProfitRate,
    monthCount: monthlyData.length,
    startYear,
    startMonth,
    endYear,
    endMonth,
    bestMonth: {
      year: bestMonth.year,
      month: bestMonth.month,
      profit: bestMonth.calculatedProfit,
      accountName: bestMonth.accountName,
    },
    worstMonth: {
      year: worstMonth.year,
      month: worstMonth.month,
      profit: worstMonth.calculatedProfit,
      accountName: worstMonth.accountName,
    },
    monthlyData,
    hasData: true,
  }
}
