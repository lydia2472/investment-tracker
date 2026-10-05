import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { calculateAccountBalanceFromTransactions } from '@/lib/utils/account-balance-helpers'
import { isGoldAccount } from '@/lib/utils/gold-profit-helpers'

import { AccountType } from '@/types'

import { useAccountStore } from './account-store'
import { persistStorage } from './persist-storage'
import { useTransactionStore } from './transaction-store'

/**
 * 快照接口
 */
export interface Snapshot {
  id: string
  accountId: string
  balance: number // 快照金额
  snapshotDate: Date // 快照日期
  investmentAmount?: number // 投资金额（可选）
  goldMarketPrice?: number // 黄金账户：当月市场均价（元/克）
  goldGrams?: number // 黄金账户：当月累计克数
  note?: string // 备注
  createdAt: Date
  updatedAt: Date
}

function syncAccountBalanceFromSnapshots(accountId: string, snapshots: Snapshot[]) {
  const accountStore = useAccountStore.getState()
  const account = accountStore.getAccount(accountId)

  if (!account) {
    return
  }

  const latestSnapshot = snapshots
    .filter((snapshot) => snapshot.accountId === accountId)
    .sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime())[0]

  if (latestSnapshot) {
    accountStore.updateBalance(accountId, latestSnapshot.balance)
    return
  }

  // 没有快照时的兜底：用交易记录重算余额。
  // 但黄金账户的余额语义是"当前市值（均价×克数）"，与交易记录（收益/亏损）无关，
  // 用交易重算会把"累计收益"误算成余额。因此黄金账户无快照时保持当前余额不变，
  // 绝不用 calculateAccountBalanceFromTransactions 重算，也不用 initialBalance 覆盖。
  if (account.type === AccountType.GOLD) {
    // 黄金账户无快照时保持当前 balance 不变，不做任何更新
    return
  }

  const transactions = useTransactionStore.getState().transactions
  const recalculatedBalance = calculateAccountBalanceFromTransactions(account, transactions)
  accountStore.updateBalance(accountId, recalculatedBalance)
}

/**
 * 快照 Store 接口
 */
interface SnapshotStore {
  snapshots: Snapshot[]

  // 快照操作方法
  addSnapshot: (snapshot: Omit<Snapshot, 'id' | 'createdAt' | 'updatedAt'>) => void
  getSnapshotsByAccount: (accountId: string) => Snapshot[]
  getLatestSnapshot: (accountId: string, beforeDate?: Date) => Snapshot | null
  getPreviousMonthSnapshot: (accountId: string, currentDate: Date) => Snapshot | null
  deleteSnapshot: (id: string) => void
  deleteSnapshotsForAccountMonth: (accountId: string, monthDate: Date) => number
  deleteSnapshotsByAccountIds: (accountIds: string[]) => void
  updateSnapshot: (id: string, updates: Partial<Omit<Snapshot, 'id' | 'createdAt'>>) => void
}

/**
 * 快照 Store
 *
 * 管理月末快照数据，与交易列表分离存储
 */
export const useSnapshotStore = create<SnapshotStore>()(
  persist(
    (set, get) => ({
      snapshots: [],

      /**
       * 添加快照
       */
      addSnapshot: (snapshotData) => {
        const now = new Date()

        // 如果快照日期是每月1日，自动转换为上月最后一天
        let adjustedSnapshotDate = snapshotData.snapshotDate
        if (snapshotData.snapshotDate instanceof Date) {
          const date = snapshotData.snapshotDate
          if (date.getDate() === 1) {
            // 每月1日 → 上月最后一天
            const lastDayOfPrevMonth = new Date(date.getFullYear(), date.getMonth(), 0)
            lastDayOfPrevMonth.setHours(23, 59, 59, 999)
            adjustedSnapshotDate = lastDayOfPrevMonth
            console.log(
              `[SnapshotStore] 自动转换日期: ${date.toLocaleDateString('zh-CN')} → ${lastDayOfPrevMonth.toLocaleDateString('zh-CN')}`
            )
          }
        } else {
          const date = new Date(snapshotData.snapshotDate)
          if (date.getDate() === 1) {
            // 每月1日 → 上月最后一天
            const lastDayOfPrevMonth = new Date(date.getFullYear(), date.getMonth(), 0)
            lastDayOfPrevMonth.setHours(23, 59, 59, 999)
            adjustedSnapshotDate = lastDayOfPrevMonth
            console.log(
              `[SnapshotStore] 自动转换日期: ${date.toLocaleDateString('zh-CN')} → ${lastDayOfPrevMonth.toLocaleDateString('zh-CN')}`
            )
          }
        }

        const newSnapshot: Snapshot = {
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
          ...snapshotData,
          snapshotDate: adjustedSnapshotDate,
        }

        const nextSnapshots = [...get().snapshots, newSnapshot].sort(
          (a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
        )

        set({ snapshots: nextSnapshots })
        syncAccountBalanceFromSnapshots(newSnapshot.accountId, nextSnapshots)

        console.log(`[SnapshotStore] 添加快照:`, {
          accountId: newSnapshot.accountId,
          balance: newSnapshot.balance,
          investmentAmount: newSnapshot.investmentAmount,
          snapshotDate: newSnapshot.snapshotDate,
        })
      },

      /**
       * 获取指定账户的所有快照
       */
      getSnapshotsByAccount: (accountId) => {
        return get()
          .snapshots.filter((s) => s.accountId === accountId)
          .sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime())
      },

      /**
       * 获取指定账户的最新快照（可选在指定日期之前）
       */
      getLatestSnapshot: (accountId, beforeDate) => {
        const snapshots = get().getSnapshotsByAccount(accountId)

        if (beforeDate) {
          const beforeDateTime = new Date(beforeDate).getTime()
          const validSnapshots = snapshots.filter(
            (s) => new Date(s.snapshotDate).getTime() < beforeDateTime
          )
          return validSnapshots.length > 0 ? validSnapshots[0] : null
        }

        return snapshots.length > 0 ? snapshots[0] : null
      },

      /**
       * 获取指定账户的上月快照
       * 用于计算本月收益
       */
      getPreviousMonthSnapshot: (accountId, currentDate) => {
        const snapshots = get().getSnapshotsByAccount(accountId)

        if (snapshots.length === 0) {
          return null
        }

        // 计算上月最后一天
        const currentDateTime = new Date(currentDate).getTime()
        const previousMonthEnd = new Date(currentDateTime)
        previousMonthEnd.setMonth(previousMonthEnd.getMonth() - 1)
        previousMonthEnd.setDate(
          new Date(previousMonthEnd.getFullYear(), previousMonthEnd.getMonth() + 1, 0).getDate()
        )
        previousMonthEnd.setHours(23, 59, 59, 999)

        // 查找在上月最后一天之前的最新快照
        const previousMonthEndDateTime = previousMonthEnd.getTime()
        const validSnapshots = snapshots.filter(
          (s) => new Date(s.snapshotDate).getTime() <= previousMonthEndDateTime
        )

        return validSnapshots.length > 0 ? validSnapshots[0] : null
      },

      /**
       * 删除快照
       */
      deleteSnapshot: (id) => {
        const currentSnapshot = get().snapshots.find((snapshot) => snapshot.id === id)
        const nextSnapshots = get().snapshots.filter((snapshot) => snapshot.id !== id)

        set({ snapshots: nextSnapshots })

        if (currentSnapshot) {
          syncAccountBalanceFromSnapshots(currentSnapshot.accountId, nextSnapshots)
        }

        console.log(`[SnapshotStore] 删除快照: ${id}`)
      },

      deleteSnapshotsForAccountMonth: (accountId, monthDate) => {
        const targetYear = monthDate.getFullYear()
        const targetMonth = monthDate.getMonth()
        const snapshotsToDelete = get().snapshots.filter((snapshot) => {
          if (snapshot.accountId !== accountId) {
            return false
          }

          const snapshotDate =
            snapshot.snapshotDate instanceof Date
              ? snapshot.snapshotDate
              : new Date(snapshot.snapshotDate)

          return (
            snapshotDate.getFullYear() === targetYear && snapshotDate.getMonth() === targetMonth
          )
        })

        if (snapshotsToDelete.length === 0) {
          return 0
        }

        const snapshotIdSet = new Set(snapshotsToDelete.map((snapshot) => snapshot.id))
        const nextSnapshots = get().snapshots.filter((snapshot) => !snapshotIdSet.has(snapshot.id))

        set({ snapshots: nextSnapshots })
        syncAccountBalanceFromSnapshots(accountId, nextSnapshots)

        console.log(
          `[SnapshotStore] 删除账户 ${accountId} 在 ${targetYear}-${String(targetMonth + 1).padStart(2, '0')} 的 ${snapshotsToDelete.length} 条快照`
        )

        return snapshotsToDelete.length
      },

      deleteSnapshotsByAccountIds: (accountIds) => {
        if (accountIds.length === 0) {
          return
        }

        const accountIdSet = new Set(accountIds)
        const nextSnapshots = get().snapshots.filter(
          (snapshot) => !accountIdSet.has(snapshot.accountId)
        )

        set({ snapshots: nextSnapshots })

        accountIds.forEach((accountId) => {
          syncAccountBalanceFromSnapshots(accountId, nextSnapshots)
        })
      },

      /**
       * 更新快照
       */
      updateSnapshot: (id, updates) => {
        const currentSnapshot = get().snapshots.find((snapshot) => snapshot.id === id)
        if (!currentSnapshot) {
          return
        }

        const updatedSnapshot = {
          ...currentSnapshot,
          ...updates,
          updatedAt: new Date(),
        }

        const nextSnapshots = get().snapshots.map((snapshot) =>
          snapshot.id === id ? updatedSnapshot : snapshot
        )

        set({ snapshots: nextSnapshots })

        syncAccountBalanceFromSnapshots(currentSnapshot.accountId, nextSnapshots)
        if (updatedSnapshot.accountId !== currentSnapshot.accountId) {
          syncAccountBalanceFromSnapshots(updatedSnapshot.accountId, nextSnapshots)
        }

        console.log(`[SnapshotStore] 更新快照: ${id}`, updates)
      },
    }),
    {
      name: 'snapshot-storage',
      storage: persistStorage,
      // 序列化和反序列化 Date 对象
      partialize: (state) => ({
        snapshots: state.snapshots.map((s) => ({
          ...s,
          snapshotDate: s.snapshotDate.toISOString(),
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        snapshots: persistedState.snapshots.map((s: any) => ({
          ...s,
          snapshotDate: new Date(s.snapshotDate),
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        })),
      }),
    }
  )
)
