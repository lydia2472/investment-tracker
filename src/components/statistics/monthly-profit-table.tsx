'use client'

import React, { useState } from 'react'

import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from '@/lib/components/icon-adapter'
import { formatCurrency } from '@/lib/utils/formatters'

import type { MonthlyProfit } from '@/types'

interface MonthlyProfitTableProps {
  data: MonthlyProfit[]
  selectedAccounts?: string[]
}

export function MonthlyProfitTable({ data, selectedAccounts }: MonthlyProfitTableProps) {
  const [sortField, setSortField] = useState<keyof MonthlyProfit>('year')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  // 过滤数据（与图表保持一致：只在选择账户时才过滤）
  const filteredData =
    selectedAccounts && selectedAccounts.length > 0
      ? data.filter((profit) => selectedAccounts.includes(profit.accountId))
      : data

  // 排序数据
  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    return 0
  })

  // 排序处理
  const handleSort = (field: keyof MonthlyProfit) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // 展开/收起月份
  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths)
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey)
    } else {
      newExpanded.add(monthKey)
    }
    setExpandedMonths(newExpanded)
  }

  // 按月份分组
  const groupedData = sortedData.reduce((acc, profit) => {
    const monthKey = `${profit.year}-${String(profit.month).padStart(2, '0')}`
    if (!acc.has(monthKey)) {
      acc.set(monthKey, [])
    }
    acc.get(monthKey)!.push(profit)
    return acc
  }, new Map<string, MonthlyProfit[]>())

  // 渲染排序图标
  const renderSortIcon = (field: keyof MonthlyProfit) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDownIcon className="ml-1 h-3 w-3" />
    )
  }

  // 渲染收益趋势
  const renderProfitTrend = (profit: MonthlyProfit) => {
    const isPositive = profit.calculatedProfit >= 0

    if (!profit.hasCompleteData) {
      return <span className="text-xs text-muted-foreground">数据不完整</span>
    }

    return (
      <div className="flex items-center gap-1">
        {isPositive ? (
          <TrendingUpIcon className="h-4 w-4 text-[#5ec850]" />
        ) : (
          <TrendingDownIcon className="h-4 w-4 text-[#ff6464]" />
        )}
        <span className={isPositive ? 'text-[#5ec850]' : 'text-[#ff6464]'}>
          {isPositive ? '+' : ''}
          {formatCurrency(profit.calculatedProfit)}
        </span>
      </div>
    )
  }

  // 如果没有数据
  if (sortedData.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border bg-muted/20">
        <p className="text-muted-foreground">暂无月度收益数据，请先记录月末快照</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <table className="w-full">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('year')}
                  className="flex items-center font-semibold hover:text-foreground"
                >
                  月份
                  {renderSortIcon('year')}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('accountName')}
                  className="flex items-center font-semibold hover:text-foreground"
                >
                  账户
                  {renderSortIcon('accountName')}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('startBalance')}
                  className="flex items-center justify-end font-semibold hover:text-foreground"
                >
                  月初余额
                  {renderSortIcon('startBalance')}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('endBalance')}
                  className="flex items-center justify-end font-semibold hover:text-foreground"
                >
                  月末余额
                  {renderSortIcon('endBalance')}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('calculatedProfit')}
                  className="flex items-center justify-end font-semibold hover:text-foreground"
                >
                  本月收益
                  {renderSortIcon('calculatedProfit')}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('netFlow')}
                  className="flex items-center justify-end font-semibold hover:text-foreground"
                >
                  净流入
                  {renderSortIcon('netFlow')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from(groupedData.entries()).map(([monthKey, profits]) => {
              const isExpanded = expandedMonths.has(monthKey)
              const firstProfit = profits[0]

              return (
                <React.Fragment key={monthKey}>
                  <tr
                    className="border-b hover:bg-muted/30 cursor-pointer"
                    onClick={() => toggleMonth(monthKey)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ChevronRightIcon
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                        <span className="font-medium">
                          {firstProfit.year}年{firstProfit.month}月
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{profits.length} 个账户</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {(() => {
                          const totalProfit = profits.reduce(
                            (sum, p) => sum + p.calculatedProfit,
                            0
                          )
                          const isPositive = totalProfit >= 0
                          return (
                            <span
                              className={`font-semibold ${
                                isPositive ? 'text-[#5ec850]' : 'text-[#ff6464]'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {formatCurrency(totalProfit)}
                            </span>
                          )
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>

                  {/* 展开的账户详情 */}
                  {isExpanded &&
                    profits.map((profit, index) => (
                      <tr
                        key={`${monthKey}-${profit.accountId}-${index}`}
                        className="border-b bg-muted/10 text-sm"
                      >
                        <td className="px-4 py-3 pl-12">{profit.accountName}</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(profit.startBalance)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(profit.endBalance)}
                        </td>
                        <td className="px-4 py-3 text-right">{renderProfitTrend(profit)}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={profit.netFlow >= 0 ? 'text-[#5ec850]' : 'text-[#ff6464]'}
                          >
                            {profit.netFlow >= 0 ? '+' : ''}
                            {formatCurrency(profit.netFlow)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 数据说明 */}
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-semibold mb-2">📊 数据说明</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• 本月收益 = 月末快照余额 - 月初快照余额</li>
          <li>• 净流入 = 期间收入 - 期间支出（不含转账）</li>
          <li>• 只显示有完整月末快照的月份数据</li>
          <li>• 点击月份行可展开查看各账户详情</li>
        </ul>
      </div>
    </div>
  )
}
