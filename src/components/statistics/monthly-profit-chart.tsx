'use client'

import { format } from 'date-fns'
import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

import type { MonthlyProfit } from '@/types'

interface MonthlyProfitChartProps {
  data: MonthlyProfit[]
  selectedAccounts?: string[] // 如果指定，只显示这些账户
}

export function MonthlyProfitChart({ data, selectedAccounts }: MonthlyProfitChartProps) {
  // 过滤并转换数据用于图表显示
  const chartData = useMemo(() => {
    // 按月份分组数据，计算每月总收益
    const monthMap = new Map<string, { month: string; totalProfit: number }>()

    data.forEach((profit) => {
      // 如果指定了账户筛选，跳过未选中的账户
      if (selectedAccounts && selectedAccounts.length > 0) {
        if (!selectedAccounts.includes(profit.accountId)) return
      }

      const monthKey = `${profit.year}-${String(profit.month).padStart(2, '0')}`
      const monthLabel = `${profit.year}年${profit.month}月`

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { month: monthLabel, totalProfit: 0 })
      }

      const monthData = monthMap.get(monthKey)!
      // 累加该月的总收益
      monthData.totalProfit += profit.calculatedProfit
    })

    // 转换为数组并按月份排序
    return Array.from(monthMap.values()).sort((a, b) => {
      const dateA = String(a.month).replace(/年/g, '-').replace(/月/g, '')
      const dateB = String(b.month).replace(/年/g, '-').replace(/月/g, '')
      return dateA.localeCompare(dateB)
    })
  }, [data, selectedAccounts])

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const value = payload[0].value as number
    const isPositive = value >= 0
    const color = isPositive ? '#5ec850' : '#ff6464'

    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="mb-2 font-semibold">{payload[0].payload.month}</p>
        <p className="text-sm" style={{ color }}>
          {isPositive ? '收益' : '亏损'}: {isPositive ? '+' : ''}
          {value.toFixed(2)} 元
        </p>
      </div>
    )
  }

  // 为每个柱子设置颜色
  const getBarColor = (value: number) => {
    return value >= 0 ? '#5ec850' : '#ff6464'
  }

  // 如果没有数据
  if (chartData.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border bg-muted/20">
        <p className="text-muted-foreground">暂无月度收益数据，请先记录月末快照</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-[#5ec850]/10" />
          <XAxis dataKey="month" className="text-xs" tick={{ fill: '#c8e6c0' }} />
          <YAxis tick={{ fill: '#c8e6c0' }} tickFormatter={(value) => `¥${value.toFixed(0)}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="totalProfit" name="月度收益">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.totalProfit)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 图例说明 */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-[#5ec850]" />
          <span>收益</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-[#ff6464]" />
          <span>亏损</span>
        </div>
        <p>💡 提示：月度收益 = 本月末快照余额 - 上月末快照余额（包含利息收入）</p>
      </div>
    </div>
  )
}
