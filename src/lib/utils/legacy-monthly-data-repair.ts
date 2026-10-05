import { format } from 'date-fns'

import { useTransactionStore } from '@/lib/stores/transaction-store'
import { TransactionType, type Account, type Transaction } from '@/types'

import type { Snapshot } from '@/lib/stores/snapshot-store'

export interface LegacyMonthlyDataRepairCandidate {
  transactionId: string
  snapshotId: string
  accountId: string
  accountName: string
  monthKey: string
  monthLabel: string
  amount: number
  transactionDate: Date
  snapshotDate: Date
}

export interface LegacyMonthlyDataRepairPlan {
  candidates: LegacyMonthlyDataRepairCandidate[]
  totalAmount: number
}

export interface LegacyMonthlyDataRepairResult extends LegacyMonthlyDataRepairPlan {
  removedTransactionIds: string[]
}

function normalizeDate(value: Date | string | undefined): Date | null {
  if (!value) {
    return null
  }

  const normalized = value instanceof Date ? value : new Date(value)
  return Number.isNaN(normalized.getTime()) ? null : normalized
}

function buildDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function buildMonthKey(date: Date): string {
  return format(date, 'yyyy-MM')
}

function matchesLegacyMonthlyTransferShape(transaction: Transaction): boolean {
  if (transaction.type !== TransactionType.TRANSFER_IN) {
    return false
  }

  if (transaction.transferFromAccountId || transaction.transferPairId || transaction.transferToAccountId) {
    return false
  }

  if ((transaction.amount || 0) <= 0) {
    return false
  }

  const tags = transaction.tags || []
  const hasLegacyTags = tags.includes('投资') && tags.includes('月末')
  const hasLegacyDescription = transaction.description === '本月新增投资'
  const hasLegacyNote =
    typeof transaction.note === 'string' &&
    transaction.note.includes('快照日期:') &&
    transaction.note.includes('投资金额:')

  return hasLegacyTags && hasLegacyDescription && hasLegacyNote
}

export function createLegacyMonthlyDataRepairPlan(
  accounts: Account[],
  snapshots: Snapshot[],
  transactions: Transaction[]
): LegacyMonthlyDataRepairPlan {
  const accountNameMap = new Map(accounts.map((account) => [account.id, account.name]))
  const snapshotIndex = new Map<string, Snapshot>()

  snapshots.forEach((snapshot) => {
    const snapshotDate = normalizeDate(snapshot.snapshotDate)
    if (!snapshotDate || !snapshot.investmentAmount || snapshot.investmentAmount <= 0) {
      return
    }

    const key = [
      snapshot.accountId,
      buildMonthKey(snapshotDate),
      buildDateKey(snapshotDate),
      Math.abs(snapshot.investmentAmount).toFixed(2),
    ].join(':')

    if (!snapshotIndex.has(key)) {
      snapshotIndex.set(key, snapshot)
    }
  })

  const candidates = transactions
    .filter(matchesLegacyMonthlyTransferShape)
    .flatMap((transaction) => {
      const transactionDate = normalizeDate(transaction.createdAt)
      if (!transactionDate) {
        return []
      }

      const amount = Math.abs(transaction.amount || 0)
      const monthKey = buildMonthKey(transactionDate)
      const snapshotKey = [
        transaction.accountId,
        monthKey,
        buildDateKey(transactionDate),
        amount.toFixed(2),
      ].join(':')

      const matchedSnapshot = snapshotIndex.get(snapshotKey)
      if (!matchedSnapshot) {
        return []
      }

      return [
        {
          transactionId: transaction.id,
          snapshotId: matchedSnapshot.id,
          accountId: transaction.accountId,
          accountName: accountNameMap.get(transaction.accountId) || transaction.accountId,
          monthKey,
          monthLabel: format(transactionDate, 'yyyy年MM月'),
          amount,
          transactionDate,
          snapshotDate: transactionDate,
        } satisfies LegacyMonthlyDataRepairCandidate,
      ]
    })
    .sort((left, right) => {
      if (left.monthKey !== right.monthKey) {
        return left.monthKey.localeCompare(right.monthKey)
      }

      return left.accountName.localeCompare(right.accountName)
    })

  return {
    candidates,
    totalAmount: candidates.reduce((sum, candidate) => sum + candidate.amount, 0),
  }
}

export function applyLegacyMonthlyDataRepair(
  accounts: Account[],
  snapshots: Snapshot[],
  transactions: Transaction[]
): LegacyMonthlyDataRepairResult {
  const plan = createLegacyMonthlyDataRepairPlan(accounts, snapshots, transactions)
  const removedTransactionIds = plan.candidates.map((candidate) => candidate.transactionId)

  if (removedTransactionIds.length > 0) {
    useTransactionStore.getState().deleteMultiple(removedTransactionIds)
  }

  return {
    ...plan,
    removedTransactionIds,
  }
}
