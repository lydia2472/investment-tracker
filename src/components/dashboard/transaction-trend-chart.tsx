'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

import { buildMonthlyCashflowTrend } from '@/lib/utils/cashflow-helpers'

import type { Transaction } from '@/types'

interface TransactionTrendChartProps {
  transactions: Transaction[]
}

export function TransactionTrendChart({ transactions }: TransactionTrendChartProps) {
  const data = useMemo(() => buildMonthlyCashflowTrend(transactions), [transactions])

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        暂无数据
      </div>
    )
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '8px',
              border: 'none',
              color: '#fff',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#22c55e"
            name="收入"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="#ef4444"
            name="支出"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
