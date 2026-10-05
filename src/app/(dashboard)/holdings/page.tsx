'use client'

import { Button, Card } from 'animal-island-ui'
import { format } from 'date-fns'
import { useMemo } from 'react'
import { toast } from 'sonner'

import { AddHoldingDialog } from '@/components/holdings/add-holding-dialog'
import { AddRecordDialog } from '@/components/holdings/add-record-dialog'
import { CardLogicHint } from '@/components/dashboard/card-logic-hint'
import {
  TrashIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from '@/lib/components/icon-adapter'
import { useAccountStore, useHoldingStore } from '@/lib/stores'
import {
  calculateHoldingProfit,
  calculateHoldingsSummary,
} from '@/lib/utils/holding-calculations'
import { formatCurrency } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { iconClasses } from '@/lib/utils/design-classes'

import type { Holding, HoldingRecord } from '@/lib/stores/holding-store'

const MARKET_VALUE_LOGIC_LINES = [
  '总市值 = 各持仓最新份额 × 最新净值 之和。',
  '只统计已录入月度记录的持仓；未录入的不计入。',
]
const TOTAL_COST_LOGIC_LINES = [
  '总成本 = 各持仓最新份额 × 持仓成本 之和。',
  '持仓成本在添加持仓时设定，固定不变。',
]
const PROFIT_LOGIC_LINES = [
  '累计收益 = 总市值 − 总成本。',
  '即 各持仓 最新份额×(最新净值−持仓成本) 之和。',
  '未录入月度记录的持仓不参与计算。',
]
const PROFIT_RATE_LOGIC_LINES = [
  '收益率 = 累计收益 ÷ 总成本 × 100%。',
  '总成本为 0 时收益率显示为 0%。',
]

export default function HoldingsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const holdings = useHoldingStore((state) => state.holdings)
  const allRecords = useHoldingStore((state) => state.records)
  const removeHolding = useHoldingStore((state) => state.removeHolding)
  const deleteRecord = useHoldingStore((state) => state.deleteRecord)
  const getRecordsByHolding = useHoldingStore((state) => state.getRecordsByHolding)
  const getLatestRecord = useHoldingStore((state) => state.getLatestRecord)

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])

  // 汇总
  const summary = useMemo(
    () => calculateHoldingsSummary(holdings, getLatestRecord),
    [holdings, allRecords, getLatestRecord]
  )

  // 按持仓分组
  const groupedData = useMemo(() => {
    return holdings
      .map((holding) => {
        const account = accountMap.get(holding.accountId)
        const records = getRecordsByHolding(holding.id)
        const latest = records[0] ?? null
        const profit = calculateHoldingProfit(holding, latest)
        return { holding, account, records, latest, profit }
      })
      .sort((a, b) => b.profit.marketValue - a.profit.marketValue)
  }, [holdings, allRecords, accountMap, getRecordsByHolding])

  const handleDeleteRecord = (record: HoldingRecord, accountName?: string) => {
    deleteRecord(record.id)
    toast.success(`已删除 ${accountName ?? ''} 的 ${format(record.recordDate, 'yyyy-MM')} 记录`)
  }

  const handleDeleteHolding = (holding: Holding, accountName?: string) => {
    removeHolding(holding.id)
    toast.success(`已删除 ${accountName ?? ''} 的持仓（含全部记录）`)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">持有份额</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理基金/股票的份额与净值，计算累计收益
          </p>
        </div>
        <div className="flex gap-2">
          <AddRecordDialog />
          <AddHoldingDialog />
        </div>
      </div>

      {/* 汇总卡片 — 使用与总览页统一的 Card 组件风格 */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 总市值 */}
          <Card color="app-blue" className="group">
            <div className="flex flex-row items-center justify-between p-6 pb-2">
              <h3 className="text-sm font-semibold text-white">总市值</h3>
              <CardLogicHint hideLabel title="总市值" lines={MARKET_VALUE_LOGIC_LINES} />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-black text-white">
                {formatCurrency(summary.totalMarketValue)}
              </div>
            </div>
          </Card>

          {/* 总成本 */}
          <Card color="app-yellow" className="group">
            <div className="flex flex-row items-center justify-between p-6 pb-2">
              <h3 className="text-sm font-semibold text-white">总成本</h3>
              <CardLogicHint hideLabel title="总成本" lines={TOTAL_COST_LOGIC_LINES} />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-black text-white">
                {formatCurrency(summary.totalCost)}
              </div>
            </div>
          </Card>

          {/* 累计收益 — 动态绿/红 */}
          <Card color={summary.totalProfit >= 0 ? 'app-green' : 'app-red'} className="group">
            <div className="flex flex-row items-center justify-between p-6 pb-2">
              <h3 className="text-sm font-semibold text-white">累计收益</h3>
              <div className="flex items-center gap-2">
                <CardLogicHint hideLabel title="累计收益" lines={PROFIT_LOGIC_LINES} />
                <div className={cn(iconClasses.containerSm, 'bg-white/30')}>
                  {summary.totalProfit >= 0 ? (
                    <TrendingUpIcon className="h-full w-full text-white" />
                  ) : (
                    <TrendingDownIcon className="h-full w-full text-white" />
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-black text-white">
                {summary.totalProfit >= 0 ? '+' : ''}
                {formatCurrency(summary.totalProfit)}
              </div>
            </div>
          </Card>

          {/* 收益率 — 动态绿/红 */}
          <Card color={summary.totalProfitRate >= 0 ? 'app-green' : 'app-red'} className="group">
            <div className="flex flex-row items-center justify-between p-6 pb-2">
              <h3 className="text-sm font-semibold text-white">收益率</h3>
              <div className="flex items-center gap-2">
                <CardLogicHint hideLabel title="收益率" lines={PROFIT_RATE_LOGIC_LINES} />
                <div className={cn(iconClasses.containerSm, 'bg-white/30')}>
                  {summary.totalProfitRate >= 0 ? (
                    <TrendingUpIcon className="h-full w-full text-white" />
                  ) : (
                    <TrendingDownIcon className="h-full w-full text-white" />
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-black text-white">
                {summary.totalProfitRate >= 0 ? '+' : ''}
                {(summary.totalProfitRate * 100).toFixed(2)}%
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 空态 */}
      {holdings.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold mb-2">还没有持仓数据</h2>
          <p className="text-muted-foreground mb-6">
            添加基金或股票账户的持仓，开始记录份额和净值
          </p>
          <AddHoldingDialog
            trigger={
              <Button type="primary" size="large">
                添加第一个持仓
              </Button>
            }
          />
        </div>
      ) : (
        /* 按持仓分组的表格 */
        <div className="space-y-6">
          {groupedData.map(({ holding, account, records, profit }) => (
            <div key={holding.id} className="bg-background border rounded-xl overflow-hidden">
              {/* 持仓头部 */}
              <div className="bg-muted/50 px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: account?.color ?? '#888' }}
                    >
                      {(account?.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{account?.name ?? '未知账户'}</h3>
                      <p className="text-xs text-muted-foreground">
                        持仓成本 {holding.costPrice} 元/份 · {records.length} 条记录
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {profit.hasData && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">累计收益</p>
                        <p
                          className={cn(
                            'font-bold',
                            profit.profit >= 0 ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {profit.profit >= 0 ? '+' : ''}
                          {formatCurrency(profit.profit)}
                          <span className="text-xs ml-1">
                            ({(profit.profitRate * 100).toFixed(2)}%)
                          </span>
                        </p>
                      </div>
                    )}
                    <Button
                      type="default"
                      size="small"
                      icon={<TrashIcon />}
                      onClick={() => handleDeleteHolding(holding, account?.name)}
                    />
                  </div>
                </div>
              </div>

              {/* 记录表格 */}
              {records.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  暂无月度记录，点击"录入月度"添加
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                          月份
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                          累计份额
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                          净值
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                          持仓成本
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                          市值
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                          累计收益
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                          收益率
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => {
                        const recordProfit = calculateHoldingProfit(holding, record)
                        return (
                          <tr
                            key={record.id}
                            className="border-b last:border-b-0 hover:bg-muted/30"
                          >
                            <td className="px-6 py-3 text-sm">
                              {format(record.recordDate, 'yyyy年MM月')}
                            </td>
                            <td className="px-6 py-3 text-sm text-right">
                              {record.shares.toLocaleString('zh-CN', { maximumFractionDigits: 4 })}
                            </td>
                            <td className="px-6 py-3 text-sm text-right">{record.nav.toFixed(4)}</td>
                            <td className="px-6 py-3 text-sm text-right text-muted-foreground">
                              {(record.costPrice ?? holding.costPrice).toFixed(4)}
                            </td>
                          <td className="px-6 py-3 text-sm text-right font-medium">
                              {recordProfit.hasData ? formatCurrency(recordProfit.marketValue) : '-'}
                            </td>
                            <td
                              className={cn(
                                'px-6 py-3 text-sm text-right font-medium',
                                recordProfit.hasData && recordProfit.profit > 0
                                  ? 'text-green-600'
                                  : recordProfit.hasData && recordProfit.profit < 0
                                    ? 'text-red-600'
                                    : 'text-muted-foreground'
                              )}
                            >
                              {recordProfit.hasData
                                ? `${recordProfit.profit >= 0 ? '+' : ''}${formatCurrency(recordProfit.profit)}`
                                : '-'}
                            </td>
                            <td className="px-6 py-3 text-sm text-right">
                              {recordProfit.hasData
                                ? `${recordProfit.profitRate >= 0 ? '+' : ''}${(recordProfit.profitRate * 100).toFixed(2)}%`
                                : '-'}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <Button
                                type="default"
                                size="small"
                                icon={<TrashIcon />}
                                onClick={() => handleDeleteRecord(record, account?.name)}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
