'use client'

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import type { TagAsset } from '@/hooks/use-tag-assets'

interface TagAssetsChartProps {
  data: TagAsset[]
  totalAssets: number
  currency?: string
}

export function TagAssetsChart({ data, totalAssets, currency }: TagAssetsChartProps) {
  // 准备图表数据
  const chartData = useMemo(() => {
    if (data.length === 0) return []

    return data.map(item => ({
      name: item.tag,
      value: item.amount,
      percentage: item.percentage,
      color: item.color,
    }))
  }, [data])

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    const formatValue = (value: number) => {
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: currency || 'CNY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    }

    return (
      <div className="bg-background border rounded-lg px-3 py-2 shadow-lg">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          金额: {formatValue(data.value)}
        </p>
        <p className="text-sm text-muted-foreground">
          占比: {data.percentage.toFixed(1)}%
        </p>
      </div>
    )
  }

  // 空状态
  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        暂无标签数据
      </div>
    )
  }

  // 总资产格式化
  const formatTotal = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency || 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-4">
      {/* 总资产显示 */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">总资产</p>
        <p className="text-2xl font-bold">{formatTotal(totalAssets)}</p>
      </div>

      {/* 饼图 */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) => {
                return `${name} ${(percent * 100).toFixed(1)}%`
              }}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 详细数据列表 */}
      <div className="space-y-2">
        {chartData.map((item) => {
          const formatValue = (value: number) => {
            return new Intl.NumberFormat('zh-CN', {
              style: 'currency',
              currency: currency || 'CNY',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value)
          }

          return (
            <div
              key={item.name}
              className="flex items-center justify-between p-2 rounded hover:bg-secondary/50"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">{item.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {formatValue(item.value)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
