'use client'

import { useState, useMemo } from 'react'
import { useTransactionStore, useAccountStore } from '@/lib/stores'
import { getDateRangeProfitSummary } from '@/lib/utils/profit-calculator'
import { Button } from 'animal-island-ui'
import { MonthSelector } from './month-selector'
import { ProfitRangeSummaryCard } from './profit-range-summary-card'
import { MonthlyProfitChart } from '@/components/statistics/monthly-profit-chart'
import { MonthlyProfitTable } from '@/components/statistics/monthly-profit-table'
import { subMonths } from 'date-fns'

export function ProfitRangeSection() {
  const transactions = useTransactionStore((state) => state.transactions)
  const accounts = useAccountStore((state) => state.accounts)

  // 默认：最近 3 个月
  const now = new Date()
  const defaultEnd = now
  const defaultStart = subMonths(now, 2)

  const [startYear, setStartYear] = useState(defaultStart.getFullYear())
  const [startMonth, setStartMonth] = useState(defaultStart.getMonth() + 1)
  const [endYear, setEndYear] = useState(defaultEnd.getFullYear())
  const [endMonth, setEndMonth] = useState(defaultEnd.getMonth() + 1)

  // 计算汇总数据
  const summary = useMemo(() => {
    return getDateRangeProfitSummary(
      transactions,
      accounts,
      startYear,
      startMonth,
      endYear,
      endMonth
    )
  }, [transactions, accounts, startYear, startMonth, endYear, endMonth])

  // 预设范围处理
  const handlePreset = (months: number) => {
    const end = new Date()
    const start = subMonths(end, months - 1)
    setStartYear(start.getFullYear())
    setStartMonth(start.getMonth() + 1)
    setEndYear(end.getFullYear())
    setEndMonth(end.getMonth() + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">收益区间分析</h2>
        <p className="text-muted-foreground">查看任意时间段的收益数据和趋势</p>
      </div>

      {/* 预设范围按钮 */}
      <div className="flex flex-wrap gap-2">
        <Button type="default" size="small" className="border-2 border-[#5ec850]/50" onClick={() => handlePreset(1)}>
          本月
        </Button>
        <Button type="default" size="small" className="border-2 border-[#5ec850]/50" onClick={() => handlePreset(3)}>
          最近 3 个月
        </Button>
        <Button type="default" size="small" className="border-2 border-[#5ec850]/50" onClick={() => handlePreset(6)}>
          最近 6 个月
        </Button>
        <Button type="default" size="small" className="border-2 border-[#5ec850]/50" onClick={() => handlePreset(12)}>
          最近 1 年
        </Button>
      </div>

      {/* 日期范围选择器 */}
      <div className="flex items-center gap-4 rounded-lg border p-4 bg-muted/20">
        <MonthSelector
          label="起始日期"
          year={startYear}
          month={startMonth}
          onYearChange={setStartYear}
          onMonthChange={setStartMonth}
          maxYear={endYear}
        />
        <span className="text-muted-foreground">至</span>
        <MonthSelector
          label="结束日期"
          year={endYear}
          month={endMonth}
          onYearChange={setEndYear}
          onMonthChange={setEndMonth}
          minYear={startYear}
        />
      </div>

      {/* 汇总卡片 */}
      <ProfitRangeSummaryCard data={summary} />

      {/* 图表和表格（仅当有数据时显示） */}
      {summary.hasData && (
        <div className="grid gap-6 md:grid-cols-1">
          <MonthlyProfitChart data={summary.monthlyData} />
          <MonthlyProfitTable data={summary.monthlyData} />
        </div>
      )}
    </div>
  )
}
