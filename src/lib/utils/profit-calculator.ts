import { TransactionType } from '@/types'
import type { Transaction, Account, MonthlyProfit, SnapshotPair } from '@/types'
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
 * 计算指定快照对的月度收益
 */
export function calculateProfitForPeriod(
  startSnapshot: Transaction,
  endSnapshot: Transaction,
  periodTransactions: Transaction[],
  accountName: string
): MonthlyProfit {
  const startDate = startSnapshot.createdAt instanceof Date
    ? startSnapshot.createdAt
    : new Date(startSnapshot.createdAt)
  const endDate = endSnapshot.createdAt instanceof Date
    ? endSnapshot.createdAt
    : new Date(endSnapshot.createdAt)

  const startBalance = startSnapshot.balance || 0
  const endBalance = endSnapshot.balance || 0
  const calculatedProfit = endBalance - startBalance

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

    // 计算收益
    const profit = calculateProfitForPeriod(
      previousSnapshot,
      currentSnapshot,
      periodTransactions,
      account.name
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
