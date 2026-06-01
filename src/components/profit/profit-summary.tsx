'use client'

import { Card } from 'animal-island-ui'

import { ShellIcon, TrendingUpIcon, TrendingDownIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'
import { iconClasses, animationClasses } from '@/lib/utils/design-classes'
import { formatCurrencyCompact, formatPercentage } from '@/lib/utils/formatters'

interface AccountProfit {
  accountId: string
  accountName: string
  totalProfit: number
  profitRate: number
  startBalance: number
  endBalance: number
}

interface ProfitSummaryProps {
  accountProfits: AccountProfit[]
}

export function ProfitSummary({ accountProfits }: ProfitSummaryProps) {
  const totalProfit = accountProfits.reduce((sum, a) => sum + a.totalProfit, 0)
  const avgProfitRate =
    accountProfits.length > 0
      ? accountProfits.reduce((sum, a) => sum + a.profitRate, 0) / accountProfits.length
      : 0
  const profitCount = accountProfits.filter((a) => a.totalProfit > 0).length
  const lossCount = accountProfits.filter((a) => a.totalProfit < 0).length

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* 总收益 - 货币金额 → app-yellow */}
      <Card color="app-yellow" className="group">
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--animal-text-body)' }}>
            总收益
          </h3>
          <div className={cn(iconClasses.container, iconClasses.hover, 'bg-[var(--color-bells)]')}>
            <ShellIcon className="h-full w-full text-white" />
          </div>
        </div>
        <div className="p-6 pt-0">
          <div
            className="text-3xl font-black"
            style={{ color: 'var(--animal-text-body)', letterSpacing: '0.02em' }}
          >
            {totalProfit >= 0 ? '+' : ''}💰 {formatCurrencyCompact(totalProfit)}
          </div>
        </div>
      </Card>

      {/* 平均收益率 - 盈利指标 → app-green */}
      <Card color="app-green" className="group">
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">平均收益率</h3>
          <div className={cn(iconClasses.container, iconClasses.hover, 'bg-[var(--color-profit)]')}>
            <TrendingUpIcon className="h-full w-full text-white" />
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="text-3xl font-black text-white" style={{ letterSpacing: '0.02em' }}>
            {avgProfitRate >= 0 ? '+' : ''}
            {formatPercentage(avgProfitRate)}
          </div>
        </div>
      </Card>

      {/* 盈利账户 - 盈利计数 → app-green */}
      <Card color="app-green" className="group">
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">盈利账户</h3>
          <div className={cn(iconClasses.container, iconClasses.hover, 'bg-[var(--color-profit)]')}>
            <TrendingUpIcon className="h-full w-full text-white" />
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="text-3xl font-black text-white" style={{ letterSpacing: '0.02em' }}>
            {profitCount} <span className="text-lg opacity-80">/ {accountProfits.length}</span>
          </div>
        </div>
      </Card>

      {/* 亏损账户 - 亏损计数 → app-red */}
      <Card color="app-red" className="group">
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">亏损账户</h3>
          <div className={cn(iconClasses.container, iconClasses.hover, 'bg-[var(--color-loss)]')}>
            <TrendingDownIcon className="h-full w-full text-white" />
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="text-3xl font-black text-white" style={{ letterSpacing: '0.02em' }}>
            {lossCount} <span className="text-lg opacity-80">/ {accountProfits.length}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
