import { endOfMonth } from 'date-fns'

import { Transaction, TransactionType, Account } from '@/types'

import { calculateAccountBalanceFromTransactions, calculateBalanceFromAnchor, getTransactionBalanceDelta } from './account-balance-helpers'

import type { Snapshot } from '@/lib/stores/snapshot-store'

/**
 * 计算账户的"当前显示余额" = 最新快照余额 + 快照之后发生的交易变动。
 *
 * 快照是月末基准。快照日期之后发生的转账/消费/收入等交易必须叠加，
 * 否则"快照后转出"不会反映到界面（如9月转出、最新快照是8月末）。
 * 这与启动时 updateAllAccountsFromSnapshots 的口径保持一致。
 * 无快照时回退到 account.balance。
 */
export function calculateCurrentDisplayBalance(
  account: Pick<Account, 'id' | 'balance'>,
  transactions: Transaction[],
  snapshots: Snapshot[]
): number {
  const latest = snapshots
    .filter((s) => s.accountId === account.id)
    .sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime())[0]

  if (!latest) {
    return account.balance
  }

  let balance = latest.balance
  const snapTime = new Date(latest.snapshotDate).getTime()

  for (const txn of transactions) {
    if (txn.accountId !== account.id) continue
    if (txn.type === TransactionType.SNAPSHOT) continue
    const txnTime =
      txn.createdAt instanceof Date ? txn.createdAt.getTime() : new Date(txn.createdAt).getTime()
    if (txnTime <= snapTime) continue
    const delta = getTransactionBalanceDelta(txn)
    if (delta !== null) {
      balance += delta
    }
  }

  return balance
}

/**
 * 从 snapshot-store 的快照数组中，查找账户在指定日期的月末快照余额。
 * 这是优先的数据源（快照独立存储，比交易记录里的 SNAPSHOT 类型更完整）。
 */
function findMonthEndSnapshotFromStore(
  snapshots: Snapshot[],
  accountId: string,
  targetDate: Date
): number | null {
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate)
  const monthEnd = endOfMonth(target)

  const snapshot = snapshots
    .filter((s) => s.accountId === accountId)
    .find((s) => {
      const d = new Date(s.snapshotDate)
      return (
        d <= target &&
        d.getMonth() === monthEnd.getMonth() &&
        d.getFullYear() === monthEnd.getFullYear()
      )
    })

  return snapshot?.balance ?? null
}

/**
 * 从 snapshot-store 查找最接近目标日期（之前）的快照。
 */
function findClosestSnapshotFromStore(
  snapshots: Snapshot[],
  accountId: string,
  targetDate: Date
): { balance: number; date: Date } | null {
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate)

  const filtered = snapshots
    .filter((s) => s.accountId === accountId)
    .map((s) => ({ balance: s.balance, date: new Date(s.snapshotDate) }))
    .filter((s) => s.date <= target)
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  return filtered[0] ?? null
}

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
          txnDate <= target &&
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
): { balance: number; date: Date } | null {
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
    .filter((snapshot): snapshot is { balance: number; date: Date } => snapshot.balance !== undefined)
    .filter((snapshot) => snapshot.date <= target)
    .sort((a, b) => b.date.getTime() - a.date.getTime()) // 降序,最新的在前

  return snapshots[0] ?? null
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
  return calculateAccountBalanceFromTransactions(account, transactions, endDate)
}

/**
 * 获取账户在指定日期的期末余额。
 *
 * 数据源优先级：
 * 1. snapshot-store 的快照（snapshots 参数，最完整）
 * 2. 交易记录里的 SNAPSHOT 类型交易（兼容旧数据）
 * 3. 账户当前余额 / 按交易重算（兜底）
 *
 * @param transactions - 所有交易
 * @param account - 账户对象
 * @param endDate - 结束日期（可选）
 * @param snapshots - snapshot-store 的快照数组（可选，推荐传入）
 * @returns 期末余额
 */
export function getAccountBalanceAtDate(
  transactions: Transaction[],
  account: Account,
  endDate?: Date,
  snapshots?: Snapshot[]
): number {
  // 优先使用 snapshot-store 的快照
  if (snapshots && snapshots.length > 0) {
    if (!endDate) {
      // 无日期筛选：取该账户最新快照
      const latest = snapshots
        .filter((s) => s.accountId === account.id)
        .map((s) => ({ balance: s.balance, date: new Date(s.snapshotDate) }))
        .sort((a, b) => b.date.getTime() - a.date.getTime())[0]
      if (latest) {
        return latest.balance
      }
    } else {
      // 有日期筛选：取目标月份快照
      const snapshotBalance = findMonthEndSnapshotFromStore(snapshots, account.id, endDate)
      if (snapshotBalance !== null) {
        return snapshotBalance
      }
      // 无目标月快照：取最接近的历史快照 + 期间交易
      const previousSnapshot = findClosestSnapshotFromStore(snapshots, account.id, endDate)
      if (previousSnapshot !== null) {
        return calculateBalanceFromAnchor(
          account.id,
          previousSnapshot.balance,
          transactions,
          previousSnapshot.date,
          endDate,
          account.type
        )
      }
    }
  }

  // 无日期筛选:尝试从交易记录查找最新快照
  if (!endDate) {
    const txnSnapshots = transactions
      .filter(
        (txn) =>
          txn.accountId === account.id &&
          txn.type === TransactionType.SNAPSHOT &&
          (txn.tags?.includes('month-end') ?? false)
      )
      .map((txn) => ({
        balance: txn.balance,
        date: txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())

    if (txnSnapshots.length > 0) {
      return txnSnapshots[0]!.balance!
    }

    return account.balance
  }

  // 有日期筛选:从交易记录查找月末快照
  const snapshotBalance = findMonthEndSnapshotAtDate(transactions, account.id, endDate)
  if (snapshotBalance !== null) {
    return snapshotBalance
  }

  const previousSnapshot = findClosestMonthEndSnapshot(transactions, account.id, endDate)
  if (previousSnapshot !== null) {
    return calculateBalanceFromAnchor(
      account.id,
      previousSnapshot.balance,
      transactions,
      previousSnapshot.date,
      endDate,
      account.type
    )
  }

  return calculateBalanceFromDate(account, transactions, endDate)
}
