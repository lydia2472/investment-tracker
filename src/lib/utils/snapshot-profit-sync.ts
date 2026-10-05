import { endOfMonth } from 'date-fns'

import {
  calculateGoldMonthlyProfit,
  getGoldSnapshotValue,
  isGoldAccount,
} from '@/lib/utils/gold-profit-helpers'
import { TransactionType, type Account, type Transaction } from '@/types'

import type { Snapshot } from '@/lib/stores/snapshot-store'

export const SNAPSHOT_PROFIT_SYNC_TAG = '快照收益同步'

interface ExpectedSnapshotProfitTransaction {
  key: string
  accountId: string
  year: number
  month: number
  type: TransactionType.INVESTMENT_PROFIT | TransactionType.INVESTMENT_LOSS
  amount: number
  balance: number
  description: string
  note: string
  tags: string[]
  createdAt: Date
}

export interface SnapshotProfitSyncPlan {
  create: Array<Omit<Transaction, 'id' | 'updatedAt'> & { createdAt?: Date }>
  update: Array<{
    id: string
    updates: Partial<Transaction>
  }>
  deleteIds: string[]
}

function getMonthKey(accountId: string, date: Date): string {
  return `${accountId}:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function normalizeDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

export function isSnapshotSyncTransaction(transaction: Transaction): boolean {
  if (
    transaction.type !== TransactionType.INVESTMENT_PROFIT &&
    transaction.type !== TransactionType.INVESTMENT_LOSS
  ) {
    return false
  }

  if (transaction.tags?.includes(SNAPSHOT_PROFIT_SYNC_TAG)) {
    return true
  }

  const tags = transaction.tags || []
  if (
    tags.includes('导入生成') ||
    tags.includes('快照生成') ||
    tags.includes('自动生成') ||
    tags.includes('月末')
  ) {
    return true
  }

  const description = transaction.description || ''
  return (
    description.includes('导入自动生成') ||
    description.includes('自动生成') ||
    description.includes('月末收益') ||
    description.includes('月末亏损')
  )
}

function buildExpectedTransaction(
  account: Account,
  snapshot: Snapshot,
  startBalance: number,
  previousSnapshot?: Snapshot | null
): ExpectedSnapshotProfitTransaction | null {
  const snapshotDate = normalizeDate(snapshot.snapshotDate)
  const year = snapshotDate.getFullYear()
  const month = snapshotDate.getMonth() + 1
  const investmentAmount = snapshot.investmentAmount || 0
  const isGold = isGoldAccount(account)
  const currentValue = isGold ? getGoldSnapshotValue(snapshot) : snapshot.balance
  const previousValue =
    isGold && previousSnapshot ? getGoldSnapshotValue(previousSnapshot) : startBalance
  const calculatedProfit = isGold
    ? calculateGoldMonthlyProfit({
        currentSnapshot: snapshot,
        previousSnapshot,
        fallbackPreviousValue: startBalance,
      })
    : snapshot.balance - startBalance - investmentAmount

  if (calculatedProfit === 0) {
    return null
  }

  const type =
    calculatedProfit > 0 ? TransactionType.INVESTMENT_PROFIT : TransactionType.INVESTMENT_LOSS
  const monthEnd = endOfMonth(snapshotDate)
  monthEnd.setHours(23, 59, 59, 999)

  return {
    key: getMonthKey(account.id, snapshotDate),
    accountId: account.id,
    year,
    month,
    type,
    amount: Math.abs(calculatedProfit),
    balance: currentValue,
    description: `${year}年${month}月投资${calculatedProfit > 0 ? '收益' : '亏损'}（快照自动同步）`,
    note:
      `同步来源: 月末快照\n` +
      `账户: ${account.name}\n` +
      `计算口径: ${isGold ? '黄金市值收益 = 当月均价 × 当月累计克数 - 上期黄金市值 - 当月购买金额' : '普通收益 = 本月快照 - 期初基数 - 本月投入'}\n` +
      `期初基数: ${previousValue.toFixed(2)}\n` +
      `本月快照: ${currentValue.toFixed(2)}\n` +
      `本月投入: ${investmentAmount.toFixed(2)}\n` +
      (isGold && snapshot.goldMarketPrice !== undefined
        ? `黄金均价: ${snapshot.goldMarketPrice.toFixed(2)}\n`
        : '') +
      (isGold && snapshot.goldGrams !== undefined
        ? `黄金克数: ${snapshot.goldGrams.toFixed(4)}\n`
        : '') +
      `自动收益: ${calculatedProfit.toFixed(2)}`,
    tags: ['投资收益', '快照生成', SNAPSHOT_PROFIT_SYNC_TAG],
    createdAt: monthEnd,
  }
}

function getComparableDateTime(value: Date | string | undefined): number {
  if (!value) {
    return 0
  }

  return normalizeDate(value).getTime()
}

function sameTags(left: string[] | undefined, right: string[]): boolean {
  const normalizedLeft = [...new Set(left || [])].sort()
  const normalizedRight = [...new Set(right)].sort()

  if (normalizedLeft.length !== normalizedRight.length) {
    return false
  }

  return normalizedLeft.every((tag, index) => tag === normalizedRight[index])
}

export function createSnapshotProfitSyncPlan(
  accounts: Account[],
  snapshots: Snapshot[],
  transactions: Transaction[]
): SnapshotProfitSyncPlan {
  const managedTransactions = transactions.filter(isSnapshotSyncTransaction)
  const existingByKey = new Map<string, Transaction[]>()

  managedTransactions.forEach((transaction) => {
    const key = getMonthKey(transaction.accountId, normalizeDate(transaction.createdAt))
    if (!existingByKey.has(key)) {
      existingByKey.set(key, [])
    }
    existingByKey.get(key)!.push(transaction)
  })

  const expectedByKey = new Map<string, ExpectedSnapshotProfitTransaction>()

  accounts.forEach((account) => {
    const accountSnapshots = snapshots
      .filter((snapshot) => snapshot.accountId === account.id)
      .sort(
        (left, right) =>
          normalizeDate(left.snapshotDate).getTime() - normalizeDate(right.snapshotDate).getTime()
      )

    accountSnapshots.forEach((snapshot, index) => {
      const snapshotDate = normalizeDate(snapshot.snapshotDate)
      const key = getMonthKey(account.id, snapshotDate)

      // 首月（账户第一条快照所在月份）直接跳过，不计算收益。
      // 原因：首月没有"上月快照"作为对比基数，用 initialBalance 当基数算出的
      // 收益不合理（会把"初始余额与首月快照的差"误算成收益）。
      // 收益从第二个月起才开始计算（基于上月快照 vs 本月快照）。
      if (index === 0) {
        return
      }

      const previousSnapshot = accountSnapshots[index - 1]
      const expectedTransaction = buildExpectedTransaction(
        account,
        snapshot,
        previousSnapshot.balance,
        previousSnapshot
      )

      if (expectedTransaction) {
        expectedByKey.set(key, expectedTransaction)
      }
    })
  })

  const plan: SnapshotProfitSyncPlan = {
    create: [],
    update: [],
    deleteIds: [],
  }

  existingByKey.forEach((group, key) => {
    const expected = expectedByKey.get(key)
    const [primary, ...duplicates] = [...group].sort(
      (left, right) =>
        getComparableDateTime(left.createdAt) - getComparableDateTime(right.createdAt)
    )

    duplicates.forEach((transaction) => {
      plan.deleteIds.push(transaction.id)
    })

    if (!primary) {
      return
    }

    if (!expected) {
      plan.deleteIds.push(primary.id)
      return
    }

    const shouldUpdate =
      primary.type !== expected.type ||
      Math.abs((primary.amount || 0) - expected.amount) > 0.000001 ||
      (primary.balance || 0) !== expected.balance ||
      (primary.description || '') !== expected.description ||
      (primary.note || '') !== expected.note ||
      getComparableDateTime(primary.createdAt) !== expected.createdAt.getTime() ||
      !sameTags(primary.tags, expected.tags)

    if (shouldUpdate) {
      plan.update.push({
        id: primary.id,
        updates: {
          type: expected.type,
          amount: expected.amount,
          balance: expected.balance,
          description: expected.description,
          note: expected.note,
          tags: expected.tags,
          createdAt: expected.createdAt,
        },
      })
    }
  })

  expectedByKey.forEach((expected, key) => {
    if (existingByKey.has(key)) {
      return
    }

    plan.create.push({
      accountId: expected.accountId,
      type: expected.type,
      amount: expected.amount,
      balance: expected.balance,
      description: expected.description,
      note: expected.note,
      tags: expected.tags,
      createdAt: expected.createdAt,
    })
  })

  return plan
}
