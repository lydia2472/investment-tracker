'use client'

import { Card } from 'animal-island-ui'

import { TrendingUpIcon, TrendingDownIcon, SparklesIcon } from '@/lib/components/icon-adapter'
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

interface AccountCardProps {
  data: AccountProfit
}

export function AccountCard({ data }: AccountCardProps) {
  const isPositive = data.totalProfit >= 0
  const isTopPerformer = data.totalProfit > 0 // 可以根据需要调整逻辑
  const cardColor = isPositive ? 'app-green' : 'app-red'
  const iconBgClass = isPositive ? 'bg-[var(--color-profit)]' : 'bg-[var(--color-loss)]'

  return (
    <Card
      color={cardColor}
      className={cn(
        'group relative',
        animationClasses.cardHover,
        isTopPerformer && 'ring-2 ring-[var(--color-bells)]/50'
      )}
    >
      {isTopPerformer && (
        <div
          className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-[var(--color-bells)] flex items-center justify-center shadow-lg"
          style={{ boxShadow: '0 3px 0 0 var(--color-acorn)' }}
        >
          <SparklesIcon className="h-4 w-4 text-white" />
        </div>
      )}

      <div className="flex flex-row items-center justify-between p-6 pb-2">
        <h3 className="text-sm font-semibold text-white">{data.accountName}</h3>
        <div className={cn(iconClasses.container, iconClasses.hover, iconBgClass)}>
          {isPositive ? (
            <TrendingUpIcon className="h-full w-full text-white" />
          ) : (
            <TrendingDownIcon className="h-full w-full text-white" />
          )}
        </div>
      </div>

      <div className="space-y-3 p-6 pt-0">
        <div>
          <p className="text-xs opacity-80">收益金额</p>
          <div className="text-2xl font-black text-white" style={{ letterSpacing: '0.02em' }}>
            {isPositive ? '+' : ''}💰 {formatCurrencyCompact(data.totalProfit)}
          </div>
        </div>

        <div>
          <p className="text-xs opacity-80">收益率</p>
          <div className="text-xl font-bold text-white">
            {isPositive ? '+' : ''}
            {formatPercentage(data.profitRate)}
          </div>
        </div>

        <div className="pt-2 border-t border-white/20">
          <div className="flex justify-between text-xs">
            <span className="opacity-80">期初余额</span>
            <span className="font-medium">💰 {formatCurrencyCompact(data.startBalance)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="opacity-80">期末余额</span>
            <span className="font-medium">💰 {formatCurrencyCompact(data.endBalance)}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
