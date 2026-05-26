'use client'

import { useState } from 'react'
import { Card } from 'animal-island-ui'
import { ChevronDownIcon, ChevronUpIcon, TrendingUpIcon } from '@/lib/components/icon-adapter'
import { formatCurrencyCompact } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { iconClasses } from '@/lib/utils/design-classes'
import { getPriorityCurrency, formatPriorityCurrencyDisplay } from '@/lib/utils/currency-priority-helpers'
import type { MultiCurrencySummary, CurrencyStatistics } from '@/types'

interface CurrencyIncomeCardProps {
  data: MultiCurrencySummary
}

export function CurrencyIncomeCard({ data }: CurrencyIncomeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 过滤出有收入的货币
  const currenciesWithIncome = data.currencies.filter(c => c.totalIncome > 0)

  // 无收入数据
  if (currenciesWithIncome.length === 0) {
    return (
      <Card color="app-green" className="group">
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">
            各货币收入
          </h3>
          <div className={cn(iconClasses.container, 'bg-white/20')}>
            <TrendingUpIcon className="h-full w-full text-white" />
          </div>
        </div>
        <div className="p-6 pt-0">
          <p className="text-sm text-white/80">暂无收入数据</p>
        </div>
      </Card>
    )
  }

  // 单币种时降级为简单样式
  if (!data.hasMultipleCurrencies) {
    const singleCurrency = currenciesWithIncome[0]
    return <SingleIncomeView currency={singleCurrency} />
  }

  // 多币种时显示可折叠卡片
  return (
    <Card color="app-green" className="group">
      {/* 折叠状态：汇总信息 */}
      <div
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">
            各货币收入
          </h3>
          <div className={cn(iconClasses.container, 'bg-white/20')}>
            <TrendingUpIcon className="h-full w-full text-white" />
          </div>
        </div>

        <div className="p-6 pt-0">
          <div className="text-2xl font-black text-white">
            {formatPriorityCurrencyDisplay(
              getPriorityCurrency(currenciesWithIncome, c => c.totalIncome),
              c => c.totalIncome,
              '+'
            )}
          </div>
          <p className="text-xs opacity-80 mt-2">
            {currenciesWithIncome.length > 1
              ? `点击查看全部 ${currenciesWithIncome.length} 种货币`
              : '总收入'}
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
            {currenciesWithIncome.map((currency) => (
              <IncomeDetailItem
                key={currency.currency}
                currency={currency}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// 单币种视图（降级显示）
function SingleIncomeView({ currency }: {
  currency: CurrencyStatistics
}) {
  return (
    <Card color="app-green" className="group">
      <div className="flex flex-row items-center justify-between p-6 pb-2">
        <h3 className="text-sm font-semibold text-white">
          各货币收入
        </h3>
        <div className={cn(iconClasses.container, 'bg-white/20')}>
          <TrendingUpIcon className="h-full w-full text-white" />
        </div>
      </div>
      <div className="p-6 pt-0">
        {/* 只显示工资收入 */}
        <div className="text-3xl font-black text-white">
          +{currency.symbol} {formatCurrencyCompact(currency.totalIncome)}
        </div>
        <p className="text-xs opacity-80 mt-2">
          {currency.accountCount} 个账户
        </p>
      </div>
    </Card>
  )
}

// 单个货币收入明细项
function IncomeDetailItem({ currency }: { currency: CurrencyStatistics }) {
  return (
    <div className="bg-white/10 rounded-xl p-4 space-y-3">
      {/* 主要收入：工资 */}
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
          <div className="text-xl font-bold text-green-700">
            +{currency.symbol} {formatCurrencyCompact(currency.totalIncome)}
          </div>
          <div className="text-xs text-white/70 mt-1">工资收入</div>
        </div>
      </div>

      {/* 收支对比 */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-xs text-white/70">支出</div>
          <div className="text-sm font-semibold text-red-700">
            -{currency.symbol} {formatCurrencyCompact(currency.totalExpense)}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-xs text-white/70">净收入</div>
          <div className="text-sm font-semibold text-green-700">
            +{currency.symbol} {formatCurrencyCompact(currency.netIncome)}
          </div>
        </div>
      </div>
    </div>
  )
}
