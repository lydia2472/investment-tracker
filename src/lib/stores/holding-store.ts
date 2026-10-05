import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

import { persistStorage } from './persist-storage'

/**
 * 持仓账户：记录某个基金/股票账户的持仓成本。
 * 数据完全独立，不影响账户余额、快照、交易记录。
 */
export interface Holding {
  id: string
  /** 关联的账户ID（必须是 fund 或 stock 类型） */
  accountId: string
  /** 持仓成本（元/份），固定值 */
  costPrice: number
  createdAt: Date
  updatedAt: Date
}

/**
 * 月度持仓记录：每个月录入一次累计份额和基金净值。
 */
export interface HoldingRecord {
  id: string
  /** 关联的 Holding */
  holdingId: string
  /** 当月累计持有份额（份） */
  shares: number
  /** 当月基金净值（元/份） */
  nav: number
  /** 当月持仓成本（元/份）。定投账户每月可能不同，默认沿用上月值。 */
  costPrice?: number
  /** 记录日期（月末） */
  recordDate: Date
  note?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 持仓 Store 接口
 */
interface HoldingStore {
  holdings: Holding[]
  records: HoldingRecord[]

  // 持仓操作
  addHolding: (holding: Omit<Holding, 'id' | 'createdAt' | 'updatedAt'>) => Holding
  removeHolding: (id: string) => void
  removeHoldingByAccountId: (accountId: string) => void
  getHoldingByAccountId: (accountId: string) => Holding | undefined

  // 记录操作
  addRecord: (record: Omit<HoldingRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateRecord: (id: string, updates: Partial<Omit<HoldingRecord, 'id' | 'createdAt'>>) => void
  deleteRecord: (id: string) => void
  getRecordsByHolding: (holdingId: string) => HoldingRecord[]
  getLatestRecord: (holdingId: string) => HoldingRecord | null
  getPreviousMonthRecord: (holdingId: string, currentDate: Date) => HoldingRecord | null
}

export const useHoldingStore = create<HoldingStore>()(
  persist(
    (set, get) => ({
      holdings: [],
      records: [],

      // ============ 持仓操作 ============

      addHolding: (holding) => {
        const now = new Date()
        const newHolding: Holding = {
          ...holding,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ holdings: [...state.holdings, newHolding] }))
        console.log(`[HoldingStore] 添加持仓: 账户${holding.accountId}, 成本${holding.costPrice}`)
        return newHolding
      },

      removeHolding: (id) => {
        set((state) => ({
          holdings: state.holdings.filter((h) => h.id !== id),
          records: state.records.filter((r) => r.holdingId !== id),
        }))
        console.log(`[HoldingStore] 删除持仓: ${id}（含关联记录）`)
      },

      removeHoldingByAccountId: (accountId) => {
        const { holdings, records } = get()
        const toRemove = new Set(
          holdings.filter((h) => h.accountId === accountId).map((h) => h.id)
        )
        if (toRemove.size === 0) return
        set({
          holdings: holdings.filter((h) => h.id !== undefined && !toRemove.has(h.id)),
          records: records.filter((r) => !toRemove.has(r.holdingId)),
        })
        console.log(`[HoldingStore] 级联删除账户${accountId}的持仓（${toRemove.size}个）`)
      },

      getHoldingByAccountId: (accountId) => {
        return get().holdings.find((h) => h.accountId === accountId)
      },

      // ============ 记录操作 ============

      addRecord: (record) => {
        const now = new Date()
        const newRecord: HoldingRecord = {
          ...record,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          records: [...state.records, newRecord].sort(
            (a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()
          ),
        }))
        console.log(
          `[HoldingStore] 添加记录: 持仓${record.holdingId}, 份额${record.shares}, 净值${record.nav}`
        )
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records
            .map((r) =>
              r.id === id ? { ...r, ...updates, updatedAt: new Date() } : r
            )
            .sort(
              (a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()
            ),
        }))
        console.log(`[HoldingStore] 更新记录: ${id}`)
      },

      deleteRecord: (id) => {
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }))
        console.log(`[HoldingStore] 删除记录: ${id}`)
      },

      getRecordsByHolding: (holdingId) => {
        return get()
          .records.filter((r) => r.holdingId === holdingId)
          .sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())
      },

      getLatestRecord: (holdingId) => {
        const records = get().getRecordsByHolding(holdingId)
        return records.length > 0 ? records[0]! : null
      },

      getPreviousMonthRecord: (holdingId, currentDate) => {
        const date = new Date(currentDate)
        // 上月最后一天 23:59:59.999
        const lastDayOfPrevMonth = new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999)
        const prevTime = lastDayOfPrevMonth.getTime()
        return (
          get()
            .records.filter(
              (r) =>
                r.holdingId === holdingId &&
                new Date(r.recordDate).getTime() <= prevTime
            )
            .sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())[0] ?? null
        )
      },
    }),
    {
      name: 'holding-storage',
      storage: persistStorage,
      partialize: (state) => ({
        holdings: state.holdings.map((h) => ({
          ...h,
          createdAt: h.createdAt.toISOString(),
          updatedAt: h.updatedAt.toISOString(),
        })),
        records: state.records.map((r) => ({
          ...r,
          recordDate: r.recordDate.toISOString(),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        holdings: (persistedState.holdings || []).map((h: any) => ({
          ...h,
          createdAt: new Date(h.createdAt),
          updatedAt: new Date(h.updatedAt),
        })),
        records: (persistedState.records || []).map((r: any) => ({
          ...r,
          recordDate: new Date(r.recordDate),
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
        })),
      }),
    }
  )
)
