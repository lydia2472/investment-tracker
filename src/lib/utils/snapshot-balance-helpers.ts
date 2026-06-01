import { endOfMonth } from 'date-fns'

import { Transaction, TransactionType, Account } from '@/types'

/**
 * 查找账户在指定日期的月末快照余额
 * @param transactions - 所有交易
 * @param accountId - 账户ID
 * @param targetDate - 目标日期
 * @returns 快照余额,如果没有找到则返回 null
 */
export function findMonthEndSnapshotAtDate(
  transactions: Transaction[],
  accountId: string,
  targetDate: Date
): number | null {
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate)

  // 计算目标日期所在月份的月末
  const monthEnd = endOfMonth(target)

  // 查找该账户在目标月份的月末快照
  const snapshot = transactions.find(
    (txn) =>
      txn.accountId === accountId &&
      txn.type === TransactionType.SNAPSHOT &&
      (txn.tags?.includes('month-end') ?? false) &&
      (() => {
        const txnDate = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
        // 检查快照是否在目标月份
        return (
          txnDate.getMonth() === monthEnd.getMonth() &&
          txnDate.getFullYear() === monthEnd.getFullYear()
        )
      })()
  )

  return snapshot?.balance ?? null
}

/**
 * 查找最接近目标日期的月末快照(在目标日期之前)
 */
function findClosestMonthEndSnapshot(
  transactions: Transaction[],
  accountId: string,
  targetDate: Date
): number | null {
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate)

  // 筛选该账户的所有月末快照
  const snapshots = transactions
    .filter(
      (txn) =>
        txn.accountId === accountId &&
        txn.type === TransactionType.SNAPSHOT &&
        (txn.tags?.includes('month-end') ?? false)
    )
    .map((txn) => ({
      balance: txn.balance,
      date: txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt),
    }))
    .filter((snapshot) => snapshot.date <= target)
    .sort((a, b) => b.date.getTime() - a.date.getTime()) // 降序,最新的在前

  return snapshots[0]?.balance ?? null
}

/**
 * 从指定日期开始计算账户余额
 * 用于无快照时的降级处理
 */
function calculateBalanceFromDate(
  account: Account,
  transactions: Transaction[],
  endDate: Date
): number {
  const end = endDate instanceof Date ? endDate : new Date(endDate)

  // 从初始余额开始
  const balance = account.initialBalance || 0

  // 筛选并累加该账户在结束日期之前的所有交易
  const accountTransactions = transactions
    .filter((txn) => {
      if (txn.accountId !== account.id) return false

      const txnDate = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
      return txnDate <= end
    })
    .filter((txn) => txn.type !== TransactionType.SNAPSHOT) // 排除快照

  // 计算收入
  const income = accountTransactions
    .filter(
      (txn) =>
        txn.type === TransactionType.INCOME ||
        txn.type === TransactionType.DEPOSIT ||
        txn.type === TransactionType.TRANSFER_IN
    )
    .reduce((sum, txn) => sum + (txn.amount || 0), 0)

  // 计算支出
  const expense = accountTransactions
    .filter(
      (txn) =>
        txn.type === TransactionType.CONSUMPTION ||
        txn.type === TransactionType.TRANSFER_OUT ||
        txn.type === TransactionType.LOAN
    )
    .reduce((sum, txn) => sum + (txn.amount || 0), 0)

  return balance + income - expense
}

/**
 * 获取账户在指定日期的期末余额
 * 优先使用月末快照,否则使用当前余额
 * @param transactions - 所有交易
 * @param account - 账户对象
 * @param endDate - 结束日期
 * @returns 期末余额
 */
export function getAccountBalanceAtDate(
  transactions: Transaction[],
  account: Account,
  endDate?: Date
): number {
  // 无日期筛选:使用当前余额
  if (!endDate) {
    return account.balance
  }

  // 有日期筛选:尝试查找月末快照
  const snapshotBalance = findMonthEndSnapshotAtDate(transactions, account.id, endDate)

  // 找到快照:使用快照余额
  if (snapshotBalance !== null) {
    return snapshotBalance
  }

  // 无快照:查找最接近的历史快照
  const previousSnapshot = findClosestMonthEndSnapshot(transactions, account.id, endDate)

  if (previousSnapshot !== null) {
    return previousSnapshot
  }

  // 无任何快照:使用账户初始余额 + 期间交易
  return calculateBalanceFromDate(account, transactions, endDate)
}
