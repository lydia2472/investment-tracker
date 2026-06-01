'use client'

import { Card } from 'animal-island-ui'

import { TurnipIcon, TrendingUpIcon, TrendingDownIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'
import { iconClasses, animationClasses } from '@/lib/utils/design-classes'
import { formatCurrencyCompact } from '@/lib/utils/formatters'

interface ProfitCardData {
  totalProfit: number
  profitRate: number
  hasData: boolean
  month?: number
  year?: number
}

interface ProfitCardProps {
  data: ProfitCardData
}

export function ProfitCard({ data }: ProfitCardProps) {
  const isDateRange = data.month === undefined || data.year === undefined

  if (!data.hasData) {
    return (
      <Card color="app-yellow" className="group">
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">
            {isDateRange ? '期间收益' : '本月收益'}
          </h3>
          <div className={cn(iconClasses.container, iconClasses.hover, 'bg-[var(--color-profit)]')}>
            <TurnipIcon className="h-full w-full text-white" />
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-black text-white">暂无数据</div>
          <p className="text-xs opacity-80 mt-2">请记录月末快照以查看收益</p>
        </div>
      </Card>
    )
  }

  const isPositive = data.totalProfit >= 0
  const cardColor = 'app-yellow'
  const iconBgClass = isPositive ? 'bg-[var(--color-profit)]' : 'bg-[var(--color-loss)]'

  return (
    <Card color={cardColor} className="group">
      <div className="flex flex-row items-center justify-between p-6 pb-2">
        <h3 className="text-sm font-semibold text-white">
          {isDateRange ? '期间收益' : '本月收益'}
        </h3>
        <div className={cn(iconClasses.container, iconClasses.hover, iconBgClass)}>
          {isPositive ? (
            <TrendingUpIcon className="h-full w-full text-white" />
          ) : (
            <TrendingDownIcon className="h-full w-full text-white" />
          )}
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="text-3xl font-black text-white" style={{ letterSpacing: '0.02em' }}>
          {isPositive ? '+' : ''}💰 {formatCurrencyCompact(data.totalProfit)}
        </div>

        {!isDateRange && data.month !== undefined && data.year !== undefined && (
          <p className="text-xs opacity-80 mt-2">
            {data.year}年{data.month}月
          </p>
        )}
      </div>
    </Card>
  )
}
