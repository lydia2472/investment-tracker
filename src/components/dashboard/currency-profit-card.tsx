'use client'

import { Card } from 'animal-island-ui'
import { useState, memo, useMemo } from 'react'
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
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  TurnipIcon,
} from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'
import { iconClasses } from '@/lib/utils/design-classes'
import { formatCurrencyCompact } from '@/lib/utils/formatters'

import type { DateRange } from '@/components/dashboard/date-filter-bar'
import type { CurrencyProfitStatistics } from '@/lib/utils/currency-profit-helpers'
import type { MultiCurrencySummary , MonthlyProfit, Account } from '@/types'

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

// 货币配置
const CURRENCY_CONFIG = {
  CNY: { symbol: '¥', label: '人民币' },
  USD: { symbol: '$', label: '美元' },
  EUR: { symbol: '€', label: '欧元' },
  HKD: { symbol: 'HK$', label: '港币' },
  JPY: { symbol: '¥', label: '日元' },
} as const

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

  // 4. 转换为矩阵格式
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
    <div className="bg-white/5 rounded-t-xl space-y-4">
      {/* 标题和统计 */}
      <div className="flex items-center justify-between px-6 py-4">
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
      <div className="-mx-6 h-80">
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

interface CurrencyProfitCardProps {
  profitData: Record<string, CurrencyProfitStatistics>
  currencyData: MultiCurrencySummary
  dateRange?: DateRange
  monthlyProfits: MonthlyProfit[]
  accounts: Account[]
}

export const CurrencyProfitCard = memo(function CurrencyProfitCard({
  profitData,
  currencyData,
  dateRange,
  monthlyProfits,
  accounts,
}: CurrencyProfitCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedCurrencies, setExpandedCurrencies] = useState<Set<string>>(new Set())

  // 切换货币展开状态
  const toggleCurrency = (currency: string) => {
    const newExpanded = new Set(expandedCurrencies)
    if (newExpanded.has(currency)) {
      newExpanded.delete(currency)
    } else {
      newExpanded.add(currency)
    }
    setExpandedCurrencies(newExpanded)
  }

  // 过滤并转换月度数据
  const { currencies, months, matrix } = useMemo(() => {
    const filtered = filterMonthlyProfitsByDateRange(monthlyProfits, dateRange)
    return transformToMatrix(filtered, accounts)
  }, [monthlyProfits, accounts, dateRange])

  // 格式化日期范围显示
  const formatRangeLabel = (): string | undefined => {
    if (!dateRange?.startDate || !dateRange?.endDate) return undefined

    const formatDate = (date: Date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      return `${y}-${m}`
    }

    return `${formatDate(dateRange.startDate)} 至 ${formatDate(dateRange.endDate)}`
  }

  const rangeLabel = formatRangeLabel()

  // 过滤出有收益数据的货币
  const currenciesWithProfit = Object.values(profitData).filter((p) => p.hasData)

  // 无收益数据
  if (currenciesWithProfit.length === 0) {
    return (
      <Card color="app-yellow" className="group w-full">
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">各货币收益</h3>
          <div className={cn(iconClasses.container, 'bg-white/20')}>
            <TurnipIcon className="h-full w-full text-white" />
          </div>
        </div>
        <div className="p-6 pt-0">
          <p className="text-sm text-white/80">暂无收益数据</p>
          <p className="text-xs text-white/60 mt-2">需要月末快照数据才能计算收益</p>
        </div>
      </Card>
    )
  }

  // 单币种时降级为简单样式
  if (!currencyData.hasMultipleCurrencies) {
    const singleProfit = currenciesWithProfit[0]
    const singleCurrency = currencyData.currencies[0]
    return <SingleProfitView profit={singleProfit} currency={singleCurrency} />
  }

  // 多币种时显示可折叠卡片
  return (
    <Card color="app-yellow" className="group w-full">
      {/* 折叠状态：汇总信息 */}
      <div className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex flex-row items-center justify-between p-6 pb-2">
          <h3 className="text-sm font-semibold text-white">各货币收益</h3>
          <div className={cn(iconClasses.container, 'bg-white/20')}>
            <TurnipIcon className="h-full w-full text-white" />
          </div>
        </div>

        <div className="p-6 pt-0">
          <div className="text-2xl font-black text-white">
            {formatProfitCurrencyDisplay(profitData, currenciesWithProfit)}
          </div>
          <p className="text-xs opacity-80 mt-2">
            {currenciesWithProfit.length > 1
              ? `点击查看全部 ${currenciesWithProfit.length} 种货币`
              : '期间收益'}
          </p>

          {/* 展开/折叠指示器 */}
          <div className="flex justify-end mt-3">
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-white/80" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-white/80" />
            )}
          </div>
        </div>
      </div>

      {/* 展开状态：各货币明细 */}
      {isExpanded && (
        <div className="border-t border-white/20 pt-4 pb-6">
          {/* 日期范围提示 */}
          {rangeLabel && (
            <div className="mb-4 pb-3 border-b border-white/10 px-6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">筛选范围</span>
                <span className="text-sm font-semibold text-white">{rangeLabel}</span>
              </div>
            </div>
          )}

          {/* 各货币明细列表 */}
          <div className="space-y-4">
            {currenciesWithProfit
              .sort((a, b) => Math.abs(b.totalProfit) - Math.abs(a.totalProfit))
              .map((profit) => {
                const currency = currencyData.currencies.find((c) => c.currency === profit.currency)
                const monthlyData = months.map((month) => matrix[profit.currency]?.[month] || 0)

                return (
                  <ProfitDetailItem
                    key={profit.currency}
                    profit={profit}
                    currency={currency}
                    monthlyChartData={{
                      months,
                      data: monthlyData,
                    }}
                    isChartExpanded={expandedCurrencies.has(profit.currency)}
                    onToggleChart={() => toggleCurrency(profit.currency)}
                  />
                )
              })}
          </div>
        </div>
      )}
    </Card>
  )
})

// 单币种视图（降级显示）
const SingleProfitView = memo(function SingleProfitView({
  profit,
  currency,
}: {
  profit: CurrencyProfitStatistics
  currency?: { currency: string; symbol: string }
}) {
  const symbol = currency?.symbol || profit.symbol
  const isProfit = profit.totalProfit >= 0

  return (
    <Card color="app-yellow" className="group w-full">
      <div className="flex flex-row items-center justify-between p-6 pb-2">
        <h3 className="text-sm font-semibold text-white">期间收益</h3>
        <div className={cn(iconClasses.container, 'bg-white/20')}>
          <TurnipIcon className="h-full w-full text-white" />
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="text-3xl font-black text-white">
          {isProfit ? '+' : '-'}
          {symbol} {formatCurrencyCompact(Math.abs(profit.totalProfit))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-white/70">收益率:</span>
          <span
            className={cn(
              'text-sm font-bold',
              profit.profitRate >= 0 ? 'text-green-700' : 'text-red-700'
            )}
          >
            {profit.profitRate >= 0 ? '+' : ''}
            {profit.profitRate.toFixed(2)}%
          </span>
        </div>
      </div>
    </Card>
  )
})

// 单个货币收益明细项
const ProfitDetailItem = memo(function ProfitDetailItem({
  profit,
  currency,
  monthlyChartData,
  isChartExpanded,
  onToggleChart,
}: {
  profit: CurrencyProfitStatistics
  currency?: { currency: string; symbol: string; totalIncome?: number; totalExpense?: number }
  monthlyChartData?: { months: string[]; data: number[] }
  isChartExpanded?: boolean
  onToggleChart?: () => void
}) {
  const [localExpanded, setLocalExpanded] = useState(false)
  const isExpanded = isChartExpanded ?? localExpanded

  const toggle = () => {
    if (onToggleChart) {
      onToggleChart()
    } else {
      setLocalExpanded(!localExpanded)
    }
  }

  const symbol = currency?.symbol || profit.symbol
  const isProfit = profit.totalProfit >= 0

  // 找出收益最高的账户
  const topAccount = profit.accountProfits.sort(
    (a, b) => Math.abs(b.profit) - Math.abs(a.profit)
  )[0]

  return (
    <Collapsible open={isExpanded} onOpenChange={toggle}>
      <CollapsibleTrigger className="w-full">
        <div className="bg-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer overflow-hidden w-full">
          <div className="py-6">
            {/* 货币标题 */}
            <div className="flex items-center justify-between px-6">
              <div className="flex items-center gap-2">
                {/* 展开/折叠指示器 */}
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-white/70" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-white/70" />
                )}
                <span className="text-lg font-bold text-white">{profit.currency}</span>
                <span className="text-xs text-white/70">
                  ({profit.accountProfits.length} 个账户)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={cn('text-xl font-bold', isProfit ? 'text-green-700' : 'text-red-700')}
                >
                  {isProfit ? '+' : '-'}
                  {symbol} {formatCurrencyCompact(Math.abs(profit.totalProfit))}
                </span>
                {profit.profitRate !== 0 && (
                  <span
                    className={cn(
                      'text-xs px-2 py-1 rounded-lg',
                      profit.profitRate >= 0
                        ? 'bg-green-500/20 text-green-700'
                        : 'bg-red-500/20 text-red-700'
                    )}
                  >
                    {profit.profitRate >= 0 ? '+' : ''}
                    {profit.profitRate.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 收益率 */}
          {profit.profitRate !== 0 && (
            <div className="pb-2">
              <div className="px-6 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">加权收益率</span>
                  <span
                    className={cn(
                      'font-bold',
                      profit.profitRate >= 0 ? 'text-green-700' : 'text-red-700'
                    )}
                  >
                    {profit.profitRate >= 0 ? '+' : ''}
                    {profit.profitRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 最佳账户 */}
          {topAccount && (
            <div className="pb-6">
              <div className="px-6">
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-xs text-white/70 mb-1">收益最高账户</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{topAccount.accountName}</span>
                    <span
                      className={cn(
                        'text-xs font-bold',
                        topAccount.profit >= 0 ? 'text-green-700' : 'text-red-700'
                      )}
                    >
                      {topAccount.profit >= 0 ? '+' : '-'}
                      {symbol} {formatCurrencyCompact(Math.abs(topAccount.profit))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {monthlyChartData && (
          <div className="mt-4">
            <CurrencyMonthlyChart
              currency={profit.currency}
              months={monthlyChartData.months}
              data={monthlyChartData.data}
              symbol={symbol}
            />
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
})

// 格式化收益货币显示（特殊处理 CurrencyProfitStatistics 类型）
function formatProfitCurrencyDisplay(
  profitData: Record<string, CurrencyProfitStatistics>,
  currenciesWithProfit: CurrencyProfitStatistics[]
): string {
  if (currenciesWithProfit.length === 0) {
    return '暂无数据'
  }

  // 优先查找 CNY
  const cnyProfit = currenciesWithProfit.find((p) => p.currency === 'CNY')
  if (cnyProfit && Math.abs(cnyProfit.totalProfit) > 0) {
    const isProfit = cnyProfit.totalProfit >= 0
    return `${isProfit ? '+' : '-'}${cnyProfit.symbol} ${formatCurrencyCompact(Math.abs(cnyProfit.totalProfit))}`
  }

  // 查找收益绝对值最大的货币
  const maxProfit = currenciesWithProfit
    .filter((p) => Math.abs(p.totalProfit) > 0)
    .sort((a, b) => Math.abs(b.totalProfit) - Math.abs(a.totalProfit))[0]

  if (!maxProfit) {
    return '暂无数据'
  }

  const isProfit = maxProfit.totalProfit >= 0
  return `${isProfit ? '+' : '-'}${maxProfit.symbol} ${formatCurrencyCompact(Math.abs(maxProfit.totalProfit))}`
}
