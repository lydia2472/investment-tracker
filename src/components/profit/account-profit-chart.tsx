'use client'

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

import { cn } from '@/lib/utils/cn'

import type { Account, MonthlyProfit } from '@/types'

interface AccountProfitChartProps {
  monthlyProfits: MonthlyProfit[]
  accounts: Account[]
}

export function AccountProfitChart({ monthlyProfits, accounts }: AccountProfitChartProps) {
  // 按月聚合数据
  const chartData = useMemo(() => {
    const monthMap = new Map<string, { month: string; [key: string]: string | number }>()

    monthlyProfits.forEach((profit) => {
      const monthKey = `${profit.year}-${String(profit.month).padStart(2, '0')}`

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: `${profit.year}年${profit.month}月`,
        })
      }

      const entry = monthMap.get(monthKey)!
      entry[profit.accountName] =
        ((entry[profit.accountName] as number) || 0) + profit.calculatedProfit
    })

    return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))
  }, [monthlyProfits])

  // 为每个账户生成颜色
  const accountColors = useMemo(() => {
    const colors = [
      '#5ec850', // 萝卜绿
      '#d4b030', // 金色
      '#7dd3fc', // 天蓝
      '#f472b6', // 粉色
      '#c084fc', // 紫色
      '#fb923c', // 橙色
      '#86efac', // 浅绿
      '#fcd34d', // 黄色
    ]

    const colorMap = new Map<string, string>()
    accounts.forEach((account, index) => {
      colorMap.set(account.name, colors[index % colors.length])
    })

    return colorMap
  }, [accounts])

  if (chartData.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">暂无收益趋势数据</div>
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 diy-paper-texture">
      <h3 className="text-lg font-semibold mb-4">收益趋势图</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
          <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <YAxis
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `💰 ${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #37474f',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#f1f5f9' }}
            itemStyle={{ color: '#f1f5f9' }}
            formatter={(value) => [`💰 ${(Number(value) || 0).toFixed(0)}`, '']}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {accounts.map((account) => (
            <Line
              key={account.id}
              type="monotone"
              dataKey={account.name}
              stroke={accountColors.get(account.name) || '#5ec850'}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
