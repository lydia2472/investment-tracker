'use client'

import { format } from 'date-fns'
import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

import type { MonthlyProfit } from '@/types'

interface MonthlyProfitChartProps {
  data: MonthlyProfit[]
  selectedAccounts?: string[] // 如果指定，只显示这些账户
}

export function MonthlyProfitChart({ data, selectedAccounts }: MonthlyProfitChartProps) {
  // 过滤并转换数据用于图表显示
  const chartData = useMemo(() => {
    // 按月份分组数据
    const monthMap = new Map<string, Record<string, string | number>>()

    data.forEach((profit) => {
      // 如果指定了账户筛选，跳过未选中的账户
      if (selectedAccounts && selectedAccounts.length > 0) {
        if (!selectedAccounts.includes(profit.accountId)) return
      }

      const monthKey = `${profit.year}-${String(profit.month).padStart(2, '0')}`
      const monthLabel = `${profit.year}年${profit.month}月`

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { month: monthLabel })
      }

      const monthData = monthMap.get(monthKey)!
      // 使用账户名作为键
      monthData[profit.accountName] = profit.calculatedProfit
    })

    // 转换为数组并按月份排序
    return Array.from(monthMap.values()).sort((a, b) => {
      const dateA = String(a.month).replace(/年/g, '-').replace(/月/g, '')
      const dateB = String(b.month).replace(/年/g, '-').replace(/月/g, '')
      return dateA.localeCompare(dateB)
    })
  }, [data, selectedAccounts])

  // 获取所有唯一的账户名称（用于生成不同颜色的线条）
  const accountNames = useMemo(() => {
    const names = new Set<string>()
    data.forEach((profit) => {
      if (selectedAccounts && selectedAccounts.length > 0) {
        if (selectedAccounts.includes(profit.accountId)) {
          names.add(profit.accountName)
        }
      } else {
        names.add(profit.accountName)
      }
    })
    return Array.from(names)
  }, [data, selectedAccounts])

  // ACNH 颜色调色板
  const colors = [
    '#5ec850', // 萝卜绿（profit green）
    '#d4b030', // 铃钱金（bells gold）
    '#7bc96a', // 叶子绿（leaf green）
    '#e6b842', // 贝壳黄（shell yellow）
    '#c49944', // 橡果棕（acorn brown）
    '#ff6464', // 烂萝卜红（loss red）
    '#7bc96a', // 薄荷绿
    '#5ec850', // 萝卜绿
  ]

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="mb-2 font-semibold">{payload[0].payload.month}</p>
        {payload.map((entry: any, index: number) => {
          const value = entry.value as number
          const isPositive = value >= 0

          return (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {isPositive ? '+' : ''}
              {value.toFixed(2)} 元
            </p>
          )
        })}
      </div>
    )
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
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-[#5ec850]/10" />
          <XAxis dataKey="month" className="text-xs" tick={{ fill: '#c8e6c0' }} />
          <YAxis tick={{ fill: '#c8e6c0' }} tickFormatter={(value) => `💰 ${value.toFixed(0)}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {accountNames.map((accountName, index) => (
            <Line
              key={accountName}
              type="monotone"
              dataKey={accountName}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* 图例说明 */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#5ec850]" />
          <span>盈利</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#ff6464]" />
          <span>亏损</span>
        </div>
        <p>💡 提示：月度收益 = 本月末快照余额 - 上月末快照余额</p>
      </div>
    </div>
  )
}
