'use client'

import { Card } from 'animal-island-ui'
import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDownIcon, ChevronRightIcon } from '@/lib/components/icon-adapter'
import { MonthlyProfit , Account } from '@/types'

import type { DateRange } from '@/components/dashboard/date-filter-bar'

// 数据结构定义
interface MonthlyProfitMatrix {
  currencies: string[]
  months: string[]
  matrix: {
    [currency: string]: {
      [month: string]: number
    }
  }
}

interface CurrencyMonthlyProfitTableProps {
  monthlyProfits: MonthlyProfit[]
  accounts: Account[]
  dateRange?: DateRange
}

// 货币配置
const CURRENCY_CONFIG = {
  CNY: { symbol: '¥', label: '人民币' },
  USD: { symbol: '$', label: '美元' },
  EUR: { symbol: '€', label: '欧元' },
  HKD: { symbol: 'HK$', label: '港币' },
  JPY: { symbol: '¥', label: '日元' },
} as const

// 货币月度快照数据接口
interface CurrencyMonthlySnapshotData {
  currency: string
  year: number
  month: number
  totalStartBalance: number
  totalEndBalance: number
  totalTransferIn: number
  calculatedProfit: number
}

// 根据日期范围过滤月度数据
function filterMonthlyProfitsByDateRange(
  monthlyProfits: MonthlyProfit[],
  dateRange?: DateRange
): MonthlyProfit[] {
  if (!dateRange?.startDate || !dateRange?.endDate) {
    return monthlyProfits
  }

  const startDate = new Date(dateRange.startDate.getFullYear(), dateRange.startDate.getMonth())
  const endDate = new Date(dateRange.endDate.getFullYear(), dateRange.endDate.getMonth())

  return monthlyProfits.filter((profit) => {
    const profitDate = new Date(profit.year, profit.month - 1)
    return profitDate >= startDate && profitDate <= endDate
  })
}

// 数据转换函数（按货币分组加总后计算收益）
function transformToMatrix(
  monthlyProfits: MonthlyProfit[],
  accounts: Account[]
): MonthlyProfitMatrix {
  // 1. 构建账户ID到货币的映射
  const accountCurrencyMap = new Map(accounts.map((a) => [a.id, a.currency]))

  // 2. 按货币+月份分组快照数据
  const currencyMonthData = new Map<string, CurrencyMonthlySnapshotData>()

  monthlyProfits.forEach((profit) => {
    const currency = accountCurrencyMap.get(profit.accountId)
    if (!currency) return

    const key = `${currency}-${profit.year}-${profit.month}`

    if (!currencyMonthData.has(key)) {
      currencyMonthData.set(key, {
        currency,
        year: profit.year,
        month: profit.month,
        totalStartBalance: 0,
        totalEndBalance: 0,
        totalTransferIn: 0,
        calculatedProfit: 0,
      })
    }

    const data = currencyMonthData.get(key)!
    data.totalStartBalance += profit.startBalance
    data.totalEndBalance += profit.endBalance

    // 反推转入金额 = 期末 - 期初 - 收益
    const transferIn = profit.endBalance - profit.startBalance - profit.calculatedProfit
    data.totalTransferIn += transferIn
  })

  // 3. 计算每个货币-月份的收益（使用汇总数据）
  currencyMonthData.forEach((data) => {
    data.calculatedProfit = data.totalEndBalance - data.totalStartBalance - data.totalTransferIn
  })

  // 4. 添加调试日志
  console.log(`\n========== 货币月度收益计算（分组加总） ==========`)
  currencyMonthData.forEach((data) => {
    const monthKey = `${data.year}-${String(data.month).padStart(2, '0')}`
    console.log(`\n${data.currency} ${monthKey}:`)
    console.log(`  上月月末快照总和: ${data.totalStartBalance.toFixed(2)}`)
    console.log(`  本月月末快照总和: ${data.totalEndBalance.toFixed(2)}`)
    console.log(`  本月转入总和: ${data.totalTransferIn.toFixed(2)}`)
    console.log(`  月度收益: ${data.calculatedProfit.toFixed(2)}`)
    console.log(
      `  公式: ${data.totalEndBalance.toFixed(2)} - ${data.totalStartBalance.toFixed(2)} - ${data.totalTransferIn.toFixed(2)}`
    )
  })
  console.log(`====================================================\n`)

  // 5. 转换为矩阵格式
  const monthsSet = new Set<string>()
  const currenciesSet = new Set<string>()

  currencyMonthData.forEach((data) => {
    currenciesSet.add(data.currency)
    monthsSet.add(`${data.year}-${String(data.month).padStart(2, '0')}`)
  })

  const currencies = Array.from(currenciesSet).sort()
  const months = Array.from(monthsSet).sort()

  const matrix: { [currency: string]: { [month: string]: number } } = {}
  currencies.forEach((currency) => {
    matrix[currency] = {}
    months.forEach((month) => {
      matrix[currency][month] = 0
    })
  })

  currencyMonthData.forEach((data) => {
    const monthKey = `${data.year}-${String(data.month).padStart(2, '0')}`
    matrix[data.currency][monthKey] = data.calculatedProfit
  })

  return { currencies, months, matrix }
}

// 格式化月份显示
function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return `${year}年${month}月`
}

// 格式化金额显示
function formatCurrency(amount: number, currency: string): string {
  const config = CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG]
  const symbol = config?.symbol || currency

  // 使用千分位分隔符
  const formatted = Math.abs(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  const sign = amount >= 0 ? '+' : '-'
  return `${sign}${symbol} ${formatted}`
}

// 为单个货币创建柱状图
interface CurrencyChartProps {
  currency: string
  months: string[]
  data: number[]
  symbol: string
}

function CurrencyMonthlyChart({ currency, months, data, symbol }: CurrencyChartProps) {
  // 转换数据为 recharts 格式
  const chartData = months.map((month, index) => ({
    month: formatMonth(month),
    profit: data[index],
  }))

  // 判断每个柱子的颜色
  const getBarColor = (profit: number) => {
    return profit >= 0 ? '#16a34a' : '#dc2626' // green-700 : red-700
  }

  // 自定义 tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const profit = payload[0].value as number
      return (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200">
          <p className="text-sm font-semibold text-gray-900">{payload[0].payload.month}</p>
          <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(profit, symbol)}
          </p>
        </div>
      )
    }
    return null
  }

  // 计算总计
  const totalProfit = data.reduce((sum, val) => sum + val, 0)
  const profitCount = data.filter((v) => v > 0).length
  const lossCount = data.filter((v) => v < 0).length

  return (
    <div className="bg-white/5 rounded-xl p-6 space-y-4">
      {/* 标题和统计 */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-bold text-white">
            {CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG]?.label || currency}
          </h4>
          <p className="text-xs text-white/70 mt-1">
            {months.length} 个月 · {profitCount} 盈 · {lossCount} 亏
          </p>
        </div>
        <div className="text-right">
          <div
            className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}
          >
            {formatCurrency(totalProfit, currency)}
          </div>
          <p className="text-xs text-white/70 mt-1">累计收益</p>
        </div>
      </div>

      {/* 柱状图 */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="month"
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
              stroke="rgba(255,255,255,0.3)"
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
              stroke="rgba(255,255,255,0.3)"
              tickFormatter={(value) => `${symbol}${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.profit)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function CurrencyMonthlyProfitTable({
  monthlyProfits,
  accounts,
  dateRange,
}: CurrencyMonthlyProfitTableProps) {
  // 根据日期范围过滤数据
  const filteredProfits = useMemo(() => {
    return filterMonthlyProfitsByDateRange(monthlyProfits, dateRange)
  }, [monthlyProfits, dateRange])

  // 转换数据为矩阵格式
  const { currencies, months, matrix } = useMemo(() => {
    return transformToMatrix(filteredProfits, accounts)
  }, [filteredProfits, accounts])

  // 创建折叠状态映射
  const [expandedCurrencies, setExpandedCurrencies] = useState<Set<string>>(new Set())

  // 切换展开状态
  const toggleCurrency = (currency: string) => {
    const newExpanded = new Set(expandedCurrencies)
    if (newExpanded.has(currency)) {
      newExpanded.delete(currency)
    } else {
      newExpanded.add(currency)
    }
    setExpandedCurrencies(newExpanded)
  }

  // 空状态处理
  if (filteredProfits.length === 0) {
    return (
      <Card color="app-yellow">
        <div className="p-6 text-center text-muted-foreground">暂无月度收益数据</div>
      </Card>
    )
  }

  return (
    <Card color="app-yellow">
      <div className="p-6">
        <h3 className="text-lg font-bold text-white">各货币月度收益明细</h3>
      </div>
      <div className="px-6 pb-6 space-y-4">
        {currencies.map((currency) => {
          const config = CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG]
          const monthlyData = months.map((month) => matrix[currency]?.[month] || 0)
          const isExpanded = expandedCurrencies.has(currency)
          const totalProfit = monthlyData.reduce((sum, val) => sum + val, 0)

          return (
            <Collapsible
              key={currency}
              open={isExpanded}
              onOpenChange={() => toggleCurrency(currency)}
            >
              <CollapsibleTrigger className="w-full">
                {/* 折叠触发器 - 只显示标题和摘要 */}
                <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDownIcon className="h-5 w-5 text-white/70 transition-transform duration-200" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-white/70 transition-transform duration-200" />
                      )}
                      <span className="text-lg font-bold text-white">
                        {CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG]?.label ||
                          currency}
                      </span>
                      <span className="text-xs text-white/70">({months.length} 个月数据)</span>
                    </div>

                    {/* 累计收益 */}
                    <span
                      className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {formatCurrency(totalProfit, currency)}
                    </span>
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* 折叠内容 - 柱状图 */}
              <CollapsibleContent>
                <div className="mt-2">
                  <CurrencyMonthlyChart
                    currency={currency}
                    months={months}
                    data={monthlyData}
                    symbol={config?.symbol || currency}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>
    </Card>
  )
}
