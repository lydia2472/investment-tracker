'use client'

import { Card } from 'animal-island-ui'
import { TrophyIcon, TrendingUpIcon, TrendingDownIcon } from '@/lib/components/icon-adapter'
import { formatPercentage } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { iconClasses, animationClasses } from '@/lib/utils/design-classes'

interface RateOfReturnCardProps {
  profitRate: number  // 收益率百分比（例如：5.2 表示 +5.2%）
  hasData: boolean
}

export function RateOfReturnCard({ profitRate, hasData }: RateOfReturnCardProps) {
  const isPositive = profitRate >= 0
  const cardColor = isPositive ? 'app-green' : 'app-red'
  const iconBgClass = isPositive ? 'bg-[var(--color-profit)]' : 'bg-[var(--color-loss)]'

  if (!hasData) {
    return (
      <Card color="app-blue" className="group">
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">
            收益率
          </h3>
          <div className={cn(iconClasses.container, 'bg-[var(--animal-sidebar-active)]')}>
            <TrophyIcon className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-black text-white">
            暂无数据
          </div>
          <p className="text-xs opacity-80 mt-2">
            请记录月末快照以查看收益率
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card color={cardColor} className="group">
      <div className="flex flex-row items-center justify-between p-6 pb-2">
        <h3 className="text-sm font-semibold text-white">
          收益率
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
          {isPositive ? '+' : ''}{formatPercentage(profitRate)}
        </div>

        {/* 图标+文字说明 */}
        <div
          className={cn(
            "flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-xl w-fit transition-all",
            isPositive
              ? "bg-[var(--animal-success)] text-white"
              : "bg-[var(--animal-error)] text-white"
          )}
          style={{
            boxShadow: isPositive
              ? '0 3px 0 0 var(--animal-success-active)'
              : '0 3px 0 0 var(--animal-error-active)'
          }}
        >
          <TrophyIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-bold" style={{ letterSpacing: '0.02em' }}>
            {isPositive ? '盈利' : '亏损'}
          </span>
        </div>
      </div>
    </Card>
  )
}
