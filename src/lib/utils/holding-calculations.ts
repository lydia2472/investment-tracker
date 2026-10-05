import type { Holding, HoldingRecord } from '@/lib/stores/holding-store'

/**
 * 持仓收益计算工具。
 *
 * 收益公式：
 *   累计收益 = 最新份额 × 最新净值 - 最新份额 × 持仓成本
 *           = 最新份额 × (最新净值 - 持仓成本)
 *   收益率 = 累计收益 / (最新份额 × 持仓成本) × 100%
 *   当前市值 = 最新份额 × 最新净值
 */

export interface HoldingProfit {
  /** 当前市值 = 份额 × 最新净值 */
  marketValue: number
  /** 投入成本 = 份额 × 持仓成本 */
  totalCost: number
  /** 累计收益 = 市值 - 成本 */
  profit: number
  /** 收益率 = 收益 / 成本 */
  profitRate: number
  /** 是否有足够数据 */
  hasData: boolean
}

const EMPTY: HoldingProfit = {
  marketValue: 0,
  totalCost: 0,
  profit: 0,
  profitRate: 0,
  hasData: false,
}

/**
 * 根据持仓和最新记录，计算累计收益指标。
 *
 * @param holding 持仓（含持仓成本）
 * @param latestRecord 最新月度记录（含份额和净值）
 */
export function calculateHoldingProfit(
  holding: Holding | null | undefined,
  latestRecord: HoldingRecord | null | undefined
): HoldingProfit {
  if (!holding || !latestRecord) return EMPTY
  if (latestRecord.shares <= 0) return EMPTY

  // 持仓成本优先用记录自身的（定投每月可能不同），回退到 Holding 的固定成本
  const costPrice = latestRecord.costPrice ?? holding.costPrice

  const marketValue = latestRecord.shares * latestRecord.nav
  const totalCost = latestRecord.shares * costPrice
  const profit = marketValue - totalCost
  const profitRate = totalCost > 0 ? profit / totalCost : 0

  return { marketValue, totalCost, profit, profitRate, hasData: true }
}

export interface HoldingsSummary {
  /** 所有持仓的总市值 */
  totalMarketValue: number
  /** 所有持仓的总成本 */
  totalCost: number
  /** 总累计收益 */
  totalProfit: number
  /** 总收益率 */
  totalProfitRate: number
  /** 有数据的持仓数量 */
  count: number
}

/**
 * 汇总所有持仓的收益。
 */
export function calculateHoldingsSummary(
  holdings: Holding[],
  getLatestRecord: (holdingId: string) => HoldingRecord | null
): HoldingsSummary {
  let totalMarketValue = 0
  let totalCost = 0
  let count = 0

  for (const holding of holdings) {
    const latest = getLatestRecord(holding.id)
    const result = calculateHoldingProfit(holding, latest)
    if (result.hasData) {
      totalMarketValue += result.marketValue
      totalCost += result.totalCost
      count++
    }
  }

  const totalProfit = totalMarketValue - totalCost
  const totalProfitRate = totalCost > 0 ? totalProfit / totalCost : 0

  return { totalMarketValue, totalCost, totalProfit, totalProfitRate, count }
}
