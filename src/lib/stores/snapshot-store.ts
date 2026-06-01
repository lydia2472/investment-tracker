import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 快照接口
 */
export interface Snapshot {
  id: string
  accountId: string
  balance: number // 快照金额
  snapshotDate: Date // 快照日期
  investmentAmount?: number // 投资金额（可选）
  note?: string // 备注
  createdAt: Date
  updatedAt: Date
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
            console.log(`[SnapshotStore] 自动转换日期: ${date.toLocaleDateString('zh-CN')} → ${lastDayOfPrevMonth.toLocaleDateString('zh-CN')}`)
          }
        } else {
          const date = new Date(snapshotData.snapshotDate)
          if (date.getDate() === 1) {
            // 每月1日 → 上月最后一天
            const lastDayOfPrevMonth = new Date(date.getFullYear(), date.getMonth(), 0)
            lastDayOfPrevMonth.setHours(23, 59, 59, 999)
            adjustedSnapshotDate = lastDayOfPrevMonth
            console.log(`[SnapshotStore] 自动转换日期: ${date.toLocaleDateString('zh-CN')} → ${lastDayOfPrevMonth.toLocaleDateString('zh-CN')}`)
          }
        }

        const newSnapshot: Snapshot = {
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
          ...snapshotData,
          snapshotDate: adjustedSnapshotDate,
        }

        set((state) => ({
          snapshots: [...state.snapshots, newSnapshot].sort(
            (a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
          ),
        }))

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
        set((state) => ({
          snapshots: state.snapshots.filter((s) => s.id !== id),
        }))

        console.log(`[SnapshotStore] 删除快照: ${id}`)
      },

      /**
       * 更新快照
       */
      updateSnapshot: (id, updates) => {
        set((state) => ({
          snapshots: state.snapshots.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
          ),
        }))

        console.log(`[SnapshotStore] 更新快照: ${id}`, updates)
      },
    }),
    {
      name: 'snapshot-storage',
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
