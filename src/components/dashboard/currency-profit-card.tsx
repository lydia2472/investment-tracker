'use client'

import { useState } from 'react'
import { Card } from 'animal-island-ui'
import { ChevronDownIcon, ChevronUpIcon, TurnipIcon } from '@/lib/components/icon-adapter'
import { formatCurrencyCompact } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { iconClasses } from '@/lib/utils/design-classes'
import type { MultiCurrencySummary } from '@/types'
import type { CurrencyProfitStatistics } from '@/lib/utils/currency-profit-helpers'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CurrencyProfitCardProps {
  profitData: Record<string, CurrencyProfitStatistics>
  currencyData: MultiCurrencySummary
  availableMonths: string[]
  selectedYear?: number
  selectedMonth?: number
  onYearChange?: (year: number | undefined) => void
  onMonthChange?: (month: number | undefined) => void
}

export function CurrencyProfitCard({
  profitData,
  currencyData,
  availableMonths,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange
}: CurrencyProfitCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 格式化月份显示
  const formatMonth = (monthKey: string): string => {
    const [year, month] = monthKey.split('-')
    return `${year}年${month}月`
  }

  // 处理月份选择
  const handleMonthChange = (value: string) => {
    const [year, month] = value.split('-').map(Number)
    onYearChange?.(year)
    onMonthChange?.(month)
  }

  const currentMonthKey = selectedYear && selectedMonth
    ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    : undefined

  // 过滤出有收益数据的货币
  const currenciesWithProfit = Object.values(profitData).filter(p => p.hasData)

  // 无收益数据
  if (currenciesWithProfit.length === 0) {
    return (
      <Card color="app-yellow" className="group">
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">
            各货币收益
          </h3>
          <div className={cn(iconClasses.container, 'bg-white/20')}>
            <TurnipIcon className="h-full w-full text-white" />
          </div>
        </div>
        <div className="p-6 pt-0">
          <p className="text-sm text-white/80">暂无收益数据</p>
          <p className="text-xs text-white/60 mt-2">需要月末快照数据才能计算收益</p>
        </div>
      </Card>
    )
  }

  // 单币种时降级为简单样式
  if (!currencyData.hasMultipleCurrencies) {
    const singleProfit = currenciesWithProfit[0]
    const singleCurrency = currencyData.currencies[0]
    return (
      <SingleProfitView
        profit={singleProfit}
        currency={singleCurrency}
      />
    )
  }

  // 多币种时显示可折叠卡片
  return (
    <Card color="app-yellow" className="group">
      {/* 折叠状态：汇总信息 */}
      <div
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">
            各货币收益
          </h3>
          <div className={cn(iconClasses.container, 'bg-white/20')}>
            <TurnipIcon className="h-full w-full text-white" />
          </div>
        </div>

        <div className="p-6 pt-0">
          <div className="text-2xl font-black text-white">
            {formatProfitCurrencyDisplay(profitData, currenciesWithProfit)}
          </div>
          <p className="text-xs opacity-80 mt-2">
            {currenciesWithProfit.length > 1
              ? `点击查看全部 ${currenciesWithProfit.length} 种货币`
              : '期间收益'}
          </p>

          {/* 展开/折叠指示器 */}
          <div className="flex justify-end mt-3">
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-white/80" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-white/80" />
            )}
          </div>
        </div>
      </div>

      {/* 展开状态：各货币明细 */}
      {isExpanded && (
        <div className="border-t border-white/20 px-6 pb-6 pt-4">
          <div className="space-y-3">
            {currenciesWithProfit
              .sort((a, b) => Math.abs(b.totalProfit) - Math.abs(a.totalProfit))
              .map((profit) => {
                const currency = currencyData.currencies.find(c => c.currency === profit.currency)
                return (
                  <ProfitDetailItem
                    key={profit.currency}
                    profit={profit}
                    currency={currency}
                  />
                )
              })}
          </div>
        </div>
      )}
    </Card>
  )
}

// 单币种视图（降级显示）
function SingleProfitView({
  profit,
  currency
}: {
  profit: CurrencyProfitStatistics
  currency?: { currency: string; symbol: string }
}) {
  const symbol = currency?.symbol || profit.symbol
  const isProfit = profit.totalProfit >= 0

  return (
    <Card color="app-yellow" className="group">
      <div className="flex flex-row items-center justify-between p-6 pb-2">
        <h3 className="text-sm font-semibold text-white">
          期间收益
        </h3>
        <div className={cn(iconClasses.container, 'bg-white/20')}>
          <TurnipIcon className="h-full w-full text-white" />
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="text-3xl font-black text-white">
          {isProfit ? '+' : '-'}
          {symbol} {formatCurrencyCompact(Math.abs(profit.totalProfit))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-white/70">收益率:</span>
          <span className={cn(
            "text-sm font-bold",
            profit.profitRate >= 0 ? "text-green-700" : "text-red-700"
          )}>
            {profit.profitRate >= 0 ? '+' : ''}
            {profit.profitRate.toFixed(2)}%
          </span>
        </div>
      </div>
    </Card>
  )
}

// 单个货币收益明细项
function ProfitDetailItem({
  profit,
  currency
}: {
  profit: CurrencyProfitStatistics
  currency?: { currency: string; symbol: string; totalIncome?: number; totalExpense?: number }
}) {
  const symbol = currency?.symbol || profit.symbol
  const isProfit = profit.totalProfit >= 0

  // 找出收益最高的账户
  const topAccount = profit.accountProfits
    .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))[0]

  return (
    <div className="bg-white/10 rounded-xl p-4 space-y-2">
      {/* 货币标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">
            {profit.currency}
          </span>
          <span className="text-xs text-white/70">
            ({profit.accountProfits.length} 个账户)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn(
            "text-xl font-bold",
            isProfit ? "text-green-700" : "text-red-700"
          )}>
            {isProfit ? '+' : '-'}
            {symbol} {formatCurrencyCompact(Math.abs(profit.totalProfit))}
          </span>
          {profit.profitRate !== 0 && (
            <span className={cn(
              "text-xs px-2 py-1 rounded-lg",
              profit.profitRate >= 0 ? "bg-green-500/20 text-green-700" : "bg-red-500/20 text-red-700"
            )}>
              {profit.profitRate >= 0 ? '+' : ''}{profit.profitRate.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* 收益率 */}
      {profit.profitRate !== 0 && (
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/70">加权收益率</span>
            <span className={cn(
              "font-bold",
              profit.profitRate >= 0 ? "text-green-700" : "text-red-700"
            )}>
              {profit.profitRate >= 0 ? '+' : ''}
              {profit.profitRate.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* 最佳账户 */}
      {topAccount && (
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-xs text-white/70 mb-1">收益最高账户</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">
              {topAccount.accountName}
            </span>
            <span className={cn(
              "text-xs font-bold",
              topAccount.profit >= 0 ? "text-green-700" : "text-red-700"
            )}>
              {topAccount.profit >= 0 ? '+' : '-'}
              {symbol} {formatCurrencyCompact(Math.abs(topAccount.profit))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// 格式化收益货币显示（特殊处理 CurrencyProfitStatistics 类型）
function formatProfitCurrencyDisplay(
  profitData: Record<string, CurrencyProfitStatistics>,
  currenciesWithProfit: CurrencyProfitStatistics[]
): string {
  if (currenciesWithProfit.length === 0) {
    return '暂无数据'
  }

  // 优先查找 CNY
  const cnyProfit = currenciesWithProfit.find(p => p.currency === 'CNY')
  if (cnyProfit && Math.abs(cnyProfit.totalProfit) > 0) {
    const isProfit = cnyProfit.totalProfit >= 0
    return `${isProfit ? '+' : '-'}${cnyProfit.symbol} ${formatCurrencyCompact(Math.abs(cnyProfit.totalProfit))}`
  }

  // 查找收益绝对值最大的货币
  const maxProfit = currenciesWithProfit
    .filter(p => Math.abs(p.totalProfit) > 0)
    .sort((a, b) => Math.abs(b.totalProfit) - Math.abs(a.totalProfit))[0]

  if (!maxProfit) {
    return '暂无数据'
  }

  const isProfit = maxProfit.totalProfit >= 0
  return `${isProfit ? '+' : '-'}${maxProfit.symbol} ${formatCurrencyCompact(Math.abs(maxProfit.totalProfit))}`
}
