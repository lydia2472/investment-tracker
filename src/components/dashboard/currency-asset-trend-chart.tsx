'use client'

import { Card } from 'animal-island-ui'
import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

import { calculateAssetTrend, getCurrencyColor } from '@/lib/utils/asset-trend-helpers'

import type { DateRange } from '@/components/dashboard/date-filter-bar'
import type { MonthlyProfit , Account } from '@/types'

// 货币配置
const CURRENCY_CONFIG = {
  CNY: { symbol: '¥', label: '人民币' },
  USD: { symbol: '$', label: '美元' },
  EUR: { symbol: '€', label: '欧元' },
  HKD: { symbol: 'HK$', label: '港币' },
  JPY: { symbol: '¥', label: '日元' },
} as const

interface CurrencyAssetTrendChartProps {
  monthlyProfits: MonthlyProfit[]
  accounts: Account[]
  dateRange?: DateRange
}

export function CurrencyAssetTrendChart({
  monthlyProfits,
  accounts,
  dateRange,
}: CurrencyAssetTrendChartProps) {
  // 计算趋势数据
  const trendData = useMemo(() => {
    return calculateAssetTrend(monthlyProfits, accounts, dateRange)
  }, [monthlyProfits, accounts, dateRange])

  // 获取所有货币
  const currencies = useMemo(() => {
    if (trendData.length === 0) return []
    const currencySet = new Set<string>()
    trendData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== 'date' && key !== 'dateKey') {
          currencySet.add(key)
        }
      })
    })
    return Array.from(currencySet).sort()
  }, [trendData])

  // 空状态处理
  if (trendData.length === 0) {
    return (
      <Card color="app-yellow">
        <div className="p-6 text-center text-muted-foreground">暂无资产趋势数据</div>
      </Card>
    )
  }

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-2">{payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-700">
                {entry.dataKey}: {entry.value?.toLocaleString()} {entry.name}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card color="app-yellow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">各币种资产趋势</h3>
          {dateRange && <span className="text-xs text-white/70">{trendData.length} 个月数据</span>}
        </div>

        {/* 面积图 */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                stroke="rgba(255,255,255,0.3)"
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                stroke="rgba(255,255,255,0.3)"
                tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }} iconType="circle" />

              {currencies.map((currency) => (
                <Area
                  key={currency}
                  type="monotone"
                  dataKey={currency}
                  name={
                    CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG]?.symbol || currency
                  }
                  stroke={getCurrencyColor(currency)}
                  fill={getCurrencyColor(currency)}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 货币说明 */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/70">
          {currencies.map((currency) => {
            const config = CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG]
            const latestAmount = trendData[trendData.length - 1]?.[currency] || 0
            return (
              <div key={currency} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: getCurrencyColor(currency) }}
                />
                <span>
                  {config?.label || currency}: {latestAmount.toLocaleString()} {config?.symbol}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
