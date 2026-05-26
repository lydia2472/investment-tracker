'use client'

import { useState } from 'react'
import { Card } from 'animal-island-ui'
import { ChevronDownIcon, ChevronUpIcon, WalletIcon } from '@/lib/components/icon-adapter'
import { formatCurrencyCompact } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { iconClasses } from '@/lib/utils/design-classes'
import { getPriorityCurrency, formatPriorityCurrencyDisplay } from '@/lib/utils/currency-priority-helpers'
import type { MultiCurrencySummary, CurrencyStatistics } from '@/types'

interface CurrencyAssetsCardProps {
  data: MultiCurrencySummary
  dateRange?: { startDate?: Date; endDate?: Date }  // 可选：日期筛选
}

export function CurrencyAssetsCard({ data }: CurrencyAssetsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 单币种时降级为普通StatsCard样式
  if (!data.hasMultipleCurrencies) {
    const singleCurrency = data.currencies[0]
    if (!singleCurrency) {
      return (
        <Card color="app-yellow" className="group">
          <div className="p-6 text-center text-white">
            <p>暂无账户数据</p>
          </div>
        </Card>
      )
    }
    return <SingleCurrencyView currency={singleCurrency} />
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
            多币种资产
          </h3>
          <div className={cn(iconClasses.container, 'bg-[var(--color-profit)]')}>
            <WalletIcon className="h-full w-full text-white" />
          </div>
        </div>

        <div className="p-6 pt-0">
          <div className="text-2xl font-black text-white">
            {formatPriorityCurrencyDisplay(
              getPriorityCurrency(data.currencies, c => c.totalAssets),
              c => c.totalAssets
            )}
          </div>
          <p className="text-xs opacity-80 mt-2">
            {data.currencyCount > 1 ? `点击查看全部 ${data.currencyCount} 种货币` : '总资产'}
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

      {/* 展开状态：各币种明细 */}
      {isExpanded && (
        <div className="border-t border-white/20 px-6 pb-6 pt-4">
          <div className="space-y-3">
            {data.currencies.map((currency) => (
              <CurrencyDetailItem
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
function SingleCurrencyView({ currency }: {
  currency: CurrencyStatistics
}) {
  return (
    <Card color="app-yellow" className="group">
      <div className="flex flex-row items-center justify-between p-6 pb-2">
        <h3 className="text-sm font-semibold text-white">
          总资产
        </h3>
        <div className={cn(iconClasses.container, 'bg-[var(--color-profit)]')}>
          <WalletIcon className="h-full w-full text-white" />
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="text-3xl font-black text-white">
          {currency.symbol} {formatCurrencyCompact(currency.totalAssets)}
        </div>
        <p className="text-xs opacity-80 mt-2">
          {currency.accountCount} 个账户
        </p>
      </div>
    </Card>
  )
}

// 单个货币明细项
function CurrencyDetailItem({ currency }: { currency: CurrencyStatistics }) {
  return (
    <div className="bg-white/10 rounded-xl p-4 space-y-2">
      {/* 货币标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">
            {currency.currency}
          </span>
          <span className="text-xs text-white/70">
            ({currency.accountCount} 个账户)
          </span>
        </div>
        <span className="text-xl font-bold text-white">
          {currency.symbol} {formatCurrencyCompact(currency.totalAssets)}
        </span>
      </div>

      {/* 收支明细 */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-xs text-white/70">收入</div>
          <div className="text-sm font-semibold text-green-300">
            +{currency.symbol} {formatCurrencyCompact(currency.totalIncome)}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-xs text-white/70">支出</div>
          <div className="text-sm font-semibold text-red-300">
            -{currency.symbol} {formatCurrencyCompact(currency.totalExpense)}
          </div>
        </div>
      </div>

      {/* 净收入 */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/70">净收入</span>
          <span className={cn(
            "font-bold",
            currency.netIncome >= 0 ? "text-green-300" : "text-red-300"
          )}>
            {currency.netIncome >= 0 ? '+' : ''}
            {currency.symbol} {formatCurrencyCompact(Math.abs(currency.netIncome))}
          </span>
        </div>
      </div>
    </div>
  )
}
