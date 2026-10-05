import { AccountType, type Account } from '@/types'

import type { Snapshot } from '@/lib/stores/snapshot-store'

export function isGoldAccount(account: Pick<Account, 'type'> | null | undefined): boolean {
  return account?.type === AccountType.GOLD
}

export function calculateGoldSnapshotValue(marketPrice: number, grams: number): number {
  return marketPrice * grams
}

export function hasGoldPricing(snapshot: Pick<Snapshot, 'goldMarketPrice' | 'goldGrams'>): boolean {
  return (
    typeof snapshot.goldMarketPrice === 'number' &&
    Number.isFinite(snapshot.goldMarketPrice) &&
    typeof snapshot.goldGrams === 'number' &&
    Number.isFinite(snapshot.goldGrams)
  )
}

export function getGoldSnapshotValue(snapshot: Snapshot): number {
  if (hasGoldPricing(snapshot)) {
    return calculateGoldSnapshotValue(snapshot.goldMarketPrice!, snapshot.goldGrams!)
  }

  return snapshot.balance
}

export function calculateGoldMonthlyProfit(params: {
  currentSnapshot: Snapshot
  previousSnapshot?: Snapshot | null
  fallbackPreviousValue: number
}): number {
  const currentValue = getGoldSnapshotValue(params.currentSnapshot)
  const previousValue = params.previousSnapshot
    ? getGoldSnapshotValue(params.previousSnapshot)
    : params.fallbackPreviousValue
  const purchaseAmount = params.currentSnapshot.investmentAmount || 0

  return currentValue - previousValue - purchaseAmount
}

/**
 * 黄金账户的累计 / 成本指标（适用于"只买不卖"的定投攒金场景）。
 *
 * 注意字段语义：
 *  - snapshot.investmentAmount：**当月**购买金额（增量）
 *  - snapshot.goldGrams：**截至当月的累计克数**（不是当月增量）
 *  - snapshot.goldMarketPrice：当月市场均价（元/克）
 *
 * 因此：
 *  - 累计投入 = 所有历史快照 investmentAmount 之和
 *  - 累计克数 = 最新一条快照的 goldGrams（直接取，不要 sum）
 *  - 当前市值 = 最新快照的 均价 × 累计克数
 */
export interface GoldAccountSummary {
  /** 累计投入金额（历史所有月份购买金额之和） */
  totalInvested: number
  /** 当前累计克数（取最新快照） */
  totalGrams: number
  /** 当前市值（最新均价 × 累计克数） */
  currentValue: number
  /** 平均持仓成本（元/克）= 累计投入 ÷ 累计克数 */
  averageCostPerGram: number
  /** 累计总收益 = 当前市值 − 累计投入 */
  totalProfit: number
  /** 累计收益率 = 累计总收益 ÷ 累计投入 */
  totalProfitRate: number
  /** 最新市场均价（元/克） */
  latestMarketPrice: number
  /** 是否有足够数据计算这些指标 */
  hasData: boolean
}

/**
 * 根据某黄金账户的全部历史快照，计算累计指标。
 *
 * @param snapshots 该账户的所有快照（顺序不限，内部会按日期排序）
 */
export function calculateGoldAccountSummary(snapshots: Snapshot[]): GoldAccountSummary {
  const EMPTY: GoldAccountSummary = {
    totalInvested: 0,
    totalGrams: 0,
    currentValue: 0,
    averageCostPerGram: 0,
    totalProfit: 0,
    totalProfitRate: 0,
    latestMarketPrice: 0,
    hasData: false,
  }

  if (!snapshots || snapshots.length === 0) {
    return EMPTY
  }

  // 按日期正序，便于累加
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
  )

  // 累计投入 = 所有快照的当月购买金额之和
  // 注意：部分快照可能缺失 investmentAmount 字段（如早期录入遗漏、CSV 未填）。
  // 对于"只买不卖"的定投攒金场景，当月投入金额可通过「克数增量 × 当月均价」反推：
  //   投入 = (当月累计克数 - 上月累计克数) × 当月均价
  // 这样即使某条快照没填购买金额，也能得到合理的累计投入，避免低估成本。
  let totalInvested = 0
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]
    if (typeof cur.investmentAmount === 'number' && cur.investmentAmount > 0) {
      totalInvested += cur.investmentAmount
      continue
    }
    // investmentAmount 缺失 → 用克数增量 × 当月均价 反推
    const prevGrams = i > 0 ? sorted[i - 1].goldGrams ?? 0 : 0
    const curGrams = cur.goldGrams ?? 0
    const gramsDelta = curGrams - prevGrams
    const price = cur.goldMarketPrice ?? 0
    if (gramsDelta > 0 && price > 0) {
      totalInvested += gramsDelta * price
    }
  }

  const latest = sorted[sorted.length - 1]
  const totalGrams = latest.goldGrams ?? 0
  const latestMarketPrice = latest.goldMarketPrice ?? 0
  const currentValue = getGoldSnapshotValue(latest)

  // 平均成本：累计投入 ÷ 累计克数（克数为 0 时无法计算）
  const averageCostPerGram = totalGrams > 0 ? totalInvested / totalGrams : 0

  const totalProfit = currentValue - totalInvested
  const totalProfitRate = totalInvested > 0 ? totalProfit / totalInvested : 0

  return {
    totalInvested,
    totalGrams,
    currentValue,
    averageCostPerGram,
    totalProfit,
    totalProfitRate,
    latestMarketPrice,
    hasData: true,
  }
}
