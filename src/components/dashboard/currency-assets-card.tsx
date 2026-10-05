'use client'

import { Card } from 'animal-island-ui'
import { useState, memo } from 'react'

import { CardLogicHint } from '@/components/dashboard/card-logic-hint'
import { ChevronDownIcon, ChevronUpIcon, WalletIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'
import {
  getPriorityCurrency,
  formatPriorityCurrencyDisplay,
} from '@/lib/utils/currency-priority-helpers'
import { iconClasses } from '@/lib/utils/design-classes'
import { formatCurrencyCompact } from '@/lib/utils/formatters'

import type { MultiCurrencySummary, CurrencyStatistics, Account, MonthReference } from '@/types'

interface CurrencyAssetsCardProps {
  data: MultiCurrencySummary
  accounts: Account[] // 新增
  onAccountClick?: (account: Account) => void // 新增
  dateRange?: { startDate?: Date; endDate?: Date } // 可选：日期筛选
}

const ASSET_LOGIC_LINES = [
  '总资产 = 各账户在筛选截止日期的余额求和。',
  '余额优先取该账户最近快照，再叠加快照之后到筛选日期的交易；没有快照时按历史交易回推。',
  '未选择日期范围时，优先使用系统内最新快照月份；没有快照的账户仍按当前余额补足，因此月份标注表示最新快照基准，不使用系统当前月份。',
  '卡片下方的收入/支出/净收支/投资净收益只是辅助拆分，不会重复计入总资产。',
]

function formatMonthReference(referenceMonth: MonthReference): string {
  return `${referenceMonth.year}年${String(referenceMonth.month).padStart(2, '0')}月`
}

export const CurrencyAssetsCard = memo(function CurrencyAssetsCard({
  data,
  accounts,
  onAccountClick,
  dateRange,
}: CurrencyAssetsCardProps) {
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
  const referenceMonthLabel = !rangeLabel && data.referenceMonth
    ? formatMonthReference(data.referenceMonth)
    : undefined
  const summaryLabel =
    rangeLabel
      ? `筛选范围 ${rangeLabel}`
      : referenceMonthLabel
        ? `快照截至 ${referenceMonthLabel}`
        : '当前余额'

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
    return <SingleCurrencyView currency={singleCurrency} referenceMonthLabel={referenceMonthLabel} />
  }

  // 多币种时显示可折叠卡片
  return (
    <Card color="app-yellow" className="group">
      {/* 折叠状态：汇总信息 */}
      <div className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">各币种资产</h3>
          <div className="flex items-center gap-2">
            <CardLogicHint title="各币种资产" lines={ASSET_LOGIC_LINES} />
            <div className={cn(iconClasses.container, 'bg-[var(--color-profit)]')}>
              <WalletIcon className="h-full w-full text-white" />
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
          <div className="text-2xl font-black text-white">
            {formatPriorityCurrencyDisplay(
              getPriorityCurrency(data.currencies, (c) => c.totalAssets),
              (c) => c.totalAssets
            )}
          </div>
          <p className="text-xs opacity-80 mt-2">
            {data.currencyCount > 1
              ? `${summaryLabel} · 点击查看全部 ${data.currencyCount} 种货币`
              : summaryLabel}
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
          {/* 日期范围提示 */}
          {rangeLabel && (
            <div className="mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">筛选范围</span>
                <span className="text-sm font-semibold text-white">{rangeLabel}</span>
              </div>
            </div>
          )}
          {!rangeLabel && referenceMonthLabel && (
            <div className="mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">快照基准</span>
                <span className="text-sm font-semibold text-white">{referenceMonthLabel}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {data.currencies.map((currency) => (
              <CurrencyDetailItem
                key={currency.currency}
                currency={currency}
                accounts={accounts}
                onAccountClick={onAccountClick}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  )
})

// 单币种视图（降级显示）
const SingleCurrencyView = memo(function SingleCurrencyView({
  currency,
  referenceMonthLabel,
}: {
  currency: CurrencyStatistics
  referenceMonthLabel?: string
}) {
  return (
    <Card color="app-yellow" className="group">
      <div className="flex flex-row items-center justify-between p-6 pb-2">
        <h3 className="text-sm font-semibold text-white">总资产</h3>
        <div className="flex items-center gap-2">
          <CardLogicHint title="总资产" lines={ASSET_LOGIC_LINES} />
          <div className={cn(iconClasses.container, 'bg-[var(--color-profit)]')}>
            <WalletIcon className="h-full w-full text-white" />
          </div>
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="text-3xl font-black text-white">
          {currency.symbol} {formatCurrencyCompact(currency.totalAssets)}
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-white/70">投资净收益</span>
          <span
            className={cn(
              'font-bold',
              currency.investmentNetProfit < 0 ? 'text-red-700' : 'text-green-700'
            )}
          >
            {currency.investmentNetProfit < 0 ? '-' : '+'}
            {currency.symbol} {formatCurrencyCompact(Math.abs(currency.investmentNetProfit))}
          </span>
        </div>
        <p className="text-xs opacity-80 mt-3">
          {referenceMonthLabel ? `快照截至 ${referenceMonthLabel} · ` : ''}
          {currency.accountCount} 个账户
        </p>
      </div>
    </Card>
  )
})

// 单个货币明细项
const CurrencyDetailItem = memo(function CurrencyDetailItem({
  currency,
  accounts,
  onAccountClick,
}: {
  currency: CurrencyStatistics
  accounts: Account[]
  onAccountClick?: (account: Account) => void
}) {
  // 过滤出该币种的账户
  const currencyAccounts = accounts.filter((a) => a.currency === currency.currency)

  return (
    <div className="bg-white/10 rounded-xl p-4 space-y-2">
      {/* 货币标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{currency.currency}</span>
          <span className="text-xs text-white/70">({currency.accountCount} 个账户)</span>
        </div>
        <span className="text-xl font-bold text-white">
          {currency.symbol} {formatCurrencyCompact(currency.totalAssets)}
        </span>
      </div>

      {/* 账户列表 */}
      <div className="space-y-2 mt-3">
        {currencyAccounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/15 cursor-pointer transition-all"
            onClick={() => onAccountClick?.(account)}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: account.color }}
              >
                {account.name.charAt(0)}
              </div>
              <span className="text-sm text-white">{account.name}</span>
            </div>
            <span className="text-sm font-bold text-white">
              {formatCurrencyCompact(currency.accountBalances[account.id] ?? account.balance)}
            </span>
          </div>
        ))}
      </div>

      {/* 收支明细 */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-xs text-white/70">收入</div>
          <div className="text-sm font-semibold text-green-700">
            +{currency.symbol} {formatCurrencyCompact(currency.totalIncome)}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-xs text-white/70">支出</div>
          <div className="text-sm font-semibold text-red-700">
            -{currency.symbol} {formatCurrencyCompact(currency.totalExpense)}
          </div>
        </div>
      </div>

      {/* 收支与收益拆分展示 */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-xs text-white/70">净收支</div>
          <div
            className={cn(
              'text-sm font-semibold',
              currency.netIncome < 0 ? 'text-red-700' : 'text-green-700'
            )}
          >
            {currency.netIncome < 0 ? '-' : '+'}
            {currency.symbol} {formatCurrencyCompact(Math.abs(currency.netIncome))}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-xs text-white/70">投资净收益</div>
          <div
            className={cn(
              'text-sm font-semibold',
              currency.investmentNetProfit < 0 ? 'text-red-700' : 'text-green-700'
            )}
          >
            {currency.investmentNetProfit < 0 ? '-' : '+'}
            {currency.symbol} {formatCurrencyCompact(Math.abs(currency.investmentNetProfit))}
          </div>
        </div>
      </div>
    </div>
  )
})
