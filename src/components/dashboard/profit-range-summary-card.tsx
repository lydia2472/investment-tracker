'use client'

import { Card } from 'animal-island-ui'
import { TrendingUpIcon, TrendingDownIcon, CalendarIcon, TrophyIcon } from '@/lib/components/icon-adapter'
import { formatCurrency, formatPercentage } from '@/lib/utils/formatters'
import type { DateRangeProfitSummary } from '@/types'

interface ProfitRangeSummaryCardProps {
  data: DateRangeProfitSummary
}

export function ProfitRangeSummaryCard({ data }: ProfitRangeSummaryCardProps) {
  if (!data.hasData) {
    return (
      <Card color="app-blue" className="group">
        <div className="p-6 pb-3">
          <h3 className="text-lg text-white">收益汇总</h3>
        </div>
        <div className="p-6 pt-0">
          <p className="opacity-80">所选日期范围内暂无数据</p>
        </div>
      </Card>
    )
  }

  const isPositive = data.totalProfit >= 0
  const cardColor = isPositive ? 'app-green' : 'app-red'

  return (
    <Card color={cardColor} className="group">
      <div className="p-6 pb-3">
        <h3 className="text-lg flex items-center gap-2 text-white">
          <CalendarIcon className="h-5 w-5" />
          收益汇总
          <span className="text-sm font-normal opacity-80">
            ({data.startYear}年{data.startMonth}月 - {data.endYear}年{data.endMonth}月)
          </span>
        </h3>
      </div>
      <div className="space-y-4 p-6 pt-0">
        {/* 总收益 */}
        <div className="flex items-center justify-between">
          <span className="opacity-80">区间总收益</span>
          <div className="text-2xl font-black text-white" style={{ letterSpacing: '0.02em' }}>
            {isPositive ? '+' : ''}{formatCurrency(data.totalProfit)}
          </div>
        </div>

        {/* 平均收益率 */}
        <div className="flex items-center justify-between">
          <span className="opacity-80">平均收益率</span>
          <div className="text-lg font-semibold flex items-center gap-1 text-white">
            {data.averageProfitRate >= 0 ? (
              <TrendingUpIcon className="h-4 w-4" />
            ) : (
              <TrendingDownIcon className="h-4 w-4" />
            )}
            {formatPercentage(data.averageProfitRate)}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-xs opacity-80">统计月数</p>
            <p className="text-lg font-semibold text-white">{data.monthCount} 个月</p>
          </div>
          {data.bestMonth && (
            <div>
              <p className="text-xs opacity-80 flex items-center gap-1">
                <TrophyIcon className="h-3 w-3" />
                最佳月份
              </p>
              <p className="text-sm font-semibold text-white">
                {data.bestMonth.year}年{data.bestMonth.month}月
                ({formatCurrency(data.bestMonth.profit)})
              </p>
            </div>
          )}
          {data.worstMonth && (
            <div>
              <p className="text-xs opacity-80">最差月份</p>
              <p className="text-sm font-semibold text-white">
                {data.worstMonth.year}年{data.worstMonth.month}月
                ({formatCurrency(data.worstMonth.profit)})
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
