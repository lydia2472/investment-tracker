'use client'

import { useState, memo } from 'react'
import { Card } from 'animal-island-ui'
import { ChevronDownIcon, ChevronUpIcon, TrendingDownIcon } from '@/lib/components/icon-adapter'
import { formatCurrencyCompact } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { iconClasses } from '@/lib/utils/design-classes'
import { getPriorityCurrency, formatPriorityCurrencyDisplay } from '@/lib/utils/currency-priority-helpers'
import type { MultiCurrencySummary, CurrencyStatistics } from '@/types'
import type { DateRange } from '@/components/dashboard/date-filter-bar'

interface CurrencyExpenseCardProps {
  data: MultiCurrencySummary
  dateRange?: DateRange
}

export const CurrencyExpenseCard = memo(function CurrencyExpenseCard({ data, dateRange }: CurrencyExpenseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 格式化日期范围显示
  const formatRangeLabel = (): string | undefined => {
    if (!dateRange?.startDate || !dateRange?.endDate) return undefined

    const formatDate = (date: Date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      return `${y}-${m}`
    }

    return `${formatDate(dateRange.startDate)} 至 ${formatDate(dateRange.endDate)}`
  }

  const rangeLabel = formatRangeLabel()

  // 过滤出有支出的货币
  const currenciesWithExpense = data.currencies.filter(c => c.totalExpense > 0)

  // 无支出数据
  if (currenciesWithExpense.length === 0) {
    return (
      <Card color="app-red" className="group">
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">
            各货币支出
          </h3>
          <div className={cn(iconClasses.container, 'bg-white/20')}>
            <TrendingDownIcon className="h-full w-full text-white" />
          </div>
        </div>
        <div className="p-6 pt-0">
          <p className="text-sm text-white/80">暂无支出数据</p>
        </div>
      </Card>
    )
  }

  // 单币种时降级为简单样式
  if (!data.hasMultipleCurrencies) {
    const singleCurrency = currenciesWithExpense[0]
    return <SingleExpenseView currency={singleCurrency} />
  }

  // 多币种时显示可折叠卡片
  return (
    <Card color="app-red" className="group">
      {/* 折叠状态：汇总信息 */}
      <div
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">
            各货币支出
          </h3>
          <div className={cn(iconClasses.container, 'bg-white/20')}>
            <TrendingDownIcon className="h-full w-full text-white" />
          </div>
        </div>

        <div className="p-6 pt-0">
          <div className="text-2xl font-black text-white">
            {formatPriorityCurrencyDisplay(
              getPriorityCurrency(currenciesWithExpense, c => c.totalExpense),
              c => c.totalExpense,
              '-'
            )}
          </div>
          <p className="text-xs opacity-80 mt-2">
            {currenciesWithExpense.length > 1
              ? `点击查看全部 ${currenciesWithExpense.length} 种货币`
              : '总支出'}
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
          {/* 日期范围提示 */}
          {rangeLabel && (
            <div className="mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">筛选范围</span>
                <span className="text-sm font-semibold text-white">
                  {rangeLabel}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {currenciesWithExpense.map((currency) => (
              <ExpenseDetailItem
                key={currency.currency}
                currency={currency}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  )
})

// 单币种视图（降级显示）
const SingleExpenseView = memo(function SingleExpenseView({ currency }: { currency: CurrencyStatistics }) {
  return (
    <Card color="app-red" className="group">
      <div className="flex flex-row items-center justify-between p-6 pb-2">
        <h3 className="text-sm font-semibold text-white">
          总支出
        </h3>
        <div className={cn(iconClasses.container, 'bg-white/20')}>
          <TrendingDownIcon className="h-full w-full text-white" />
        </div>
      </div>
      <div className="p-6 pt-0 space-y-3">
        {/* 主要支出 */}
        <div>
          <div className="text-3xl font-black text-white">
            -{currency.symbol} {formatCurrencyCompact(currency.totalExpense)}
          </div>
          <p className="text-xs text-white/70 mt-1">
            总支出
          </p>
        </div>

        {/* 账户数量 */}
        <p className="text-xs opacity-80 mt-2">
          {currency.accountCount} 个账户
        </p>
      </div>
    </Card>
  )
})

// 单个货币支出明细项
const ExpenseDetailItem = memo(function ExpenseDetailItem({ currency }: { currency: CurrencyStatistics }) {
  return (
    <div className="bg-white/10 rounded-xl p-4 space-y-3">
      {/* 主要支出 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">
            {currency.currency}
          </span>
          <span className="text-xs text-white/70">
            ({currency.accountCount} 个账户)
          </span>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-red-700">
            -{currency.symbol} {formatCurrencyCompact(currency.totalExpense)}
          </div>
          <div className="text-xs text-white/70 mt-1">
            总支出
          </div>
        </div>
      </div>

      {/* 收支对比 */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-xs text-white/70">收入</div>
          <div className="text-sm font-semibold text-green-700">
            +{currency.symbol} {formatCurrencyCompact(currency.totalIncome)}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-xs text-white/70">净支出</div>
          <div className={cn(
            "text-sm font-semibold",
            currency.netIncome < 0 ? "text-red-700" : "text-green-700"
          )}>
            {currency.netIncome < 0 ? '-' : '+'}
            {currency.symbol} {formatCurrencyCompact(Math.abs(currency.netIncome))}
          </div>
        </div>
      </div>
    </div>
  )
})
