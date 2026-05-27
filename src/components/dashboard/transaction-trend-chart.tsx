'use client'

import { useMemo } from 'react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format, startOfMonth, eachMonthOfInterval } from 'date-fns'
import type { Transaction } from '@/types'

interface TransactionTrendChartProps {
  transactions: Transaction[]
}

export function TransactionTrendChart({ transactions }: TransactionTrendChartProps) {
  const data = useMemo(() => {
    if (transactions.length === 0) return []

    // 获取日期范围
    const dates = transactions.map(t =>
      t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)
    )
    const minDate = startOfMonth(new Date(Math.min(...dates.map(d => d.getTime()))))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

    // 生成月份区间
    const months = eachMonthOfInterval({ start: minDate, end: maxDate })

    // 按月统计收支
    return months.map(month => {
      const monthTxns = transactions.filter(t => {
        const txnDate = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)
        return txnDate.getMonth() === month.getMonth() &&
               txnDate.getFullYear() === month.getFullYear()
      })

      const income = monthTxns
        .filter(t => t.type === 'income' || t.type === 'deposit' || t.type === 'transfer_in')
        .reduce((sum, t) => sum + (t.amount || 0), 0)

      const expense = monthTxns
        .filter(t => t.type === 'consumption' || t.type === 'loan' || t.type === 'transfer_out')
        .reduce((sum, t) => sum + (t.amount || 0), 0)

      return {
        date: format(month, 'yyyy-MM'),
        month: format(month, 'MM月'),
        income,
        expense
      }
    })
  }, [transactions])

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
          <YAxis
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '8px',
              border: 'none',
              color: '#fff'
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
