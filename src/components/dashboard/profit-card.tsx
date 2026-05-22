'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils/formatters'
import type { DashboardProfitSummary } from '@/types'

interface ProfitCardProps {
  data: DashboardProfitSummary
}

export function ProfitCard({ data }: ProfitCardProps) {
  if (!data.hasData) {
    return (
      <Card className="group">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            本月收益
          </CardTitle>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 p-2 shadow-lg shadow-purple-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
            <PiggyBank className="h-full w-full text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">
            暂无数据
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            请记录月末快照以查看收益
          </p>
        </CardContent>
      </Card>
    )
  }

  const isPositive = data.totalProfit >= 0

  return (
    <Card className="group">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          本月收益
        </CardTitle>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br p-2 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
          isPositive
            ? 'from-purple-500 to-indigo-500 shadow-purple-500/30'
            : 'from-orange-500 to-red-500 shadow-orange-500/30'
        }`}>
          {isPositive ? (
            <TrendingUp className="h-full w-full text-white" />
          ) : (
            <TrendingDown className="h-full w-full text-white" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold bg-gradient-to-br bg-clip-text text-transparent ${
          isPositive
            ? 'from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400'
            : 'from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400'
        }`}>
          {isPositive ? '+' : ''}{formatCurrency(data.totalProfit)}
        </div>

        {/* 收益率 */}
        <div className={`flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-xl w-fit ${
          isPositive
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
        }`}>
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          <span className="text-xs font-semibold">
            收益率: {formatPercentage(data.profitRate)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          {data.year}年{data.month}月
        </p>
      </CardContent>
    </Card>
  )
}
