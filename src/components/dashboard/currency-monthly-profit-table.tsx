'use client'

import { useMemo, useState } from 'react'
import { Card } from 'animal-island-ui'
import { MonthlyProfit } from '@/types'
import { Account } from '@/types'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDownIcon, ChevronRightIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'

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

// 数据转换函数（按货币分组加总后计算收益）
function transformToMatrix(
  monthlyProfits: MonthlyProfit[],
  accounts: Account[]
): MonthlyProfitMatrix {
  // 1. 构建账户ID到货币的映射
  const accountCurrencyMap = new Map(
    accounts.map(a => [a.id, a.currency])
  )

  // 2. 按货币+月份分组快照数据
  const currencyMonthData = new Map<string, CurrencyMonthlySnapshotData>()

  monthlyProfits.forEach(profit => {
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
  currencyMonthData.forEach(data => {
    data.calculatedProfit = data.totalEndBalance - data.totalStartBalance - data.totalTransferIn
  })

  // 4. 添加调试日志
  console.log(`\n========== 货币月度收益计算（分组加总） ==========`)
  currencyMonthData.forEach(data => {
    const monthKey = `${data.year}-${String(data.month).padStart(2, '0')}`
    console.log(`\n${data.currency} ${monthKey}:`)
    console.log(`  上月月末快照总和: ${data.totalStartBalance.toFixed(2)}`)
    console.log(`  本月月末快照总和: ${data.totalEndBalance.toFixed(2)}`)
    console.log(`  本月转入总和: ${data.totalTransferIn.toFixed(2)}`)
    console.log(`  月度收益: ${data.calculatedProfit.toFixed(2)}`)
    console.log(`  公式: ${data.totalEndBalance.toFixed(2)} - ${data.totalStartBalance.toFixed(2)} - ${data.totalTransferIn.toFixed(2)}`)
  })
  console.log(`====================================================\n`)

  // 5. 转换为矩阵格式
  const monthsSet = new Set<string>()
  const currenciesSet = new Set<string>()

  currencyMonthData.forEach(data => {
    currenciesSet.add(data.currency)
    monthsSet.add(`${data.year}-${String(data.month).padStart(2, '0')}`)
  })

  const currencies = Array.from(currenciesSet).sort()
  const months = Array.from(monthsSet).sort()

  const matrix: { [currency: string]: { [month: string]: number } } = {}
  currencies.forEach(currency => {
    matrix[currency] = {}
    months.forEach(month => {
      matrix[currency][month] = 0
    })
  })

  currencyMonthData.forEach(data => {
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

// 获取收益颜色类名
function getProfitColorClass(profit: number): string {
  if (profit > 0) return 'text-green-700 text-right font-semibold'
  if (profit < 0) return 'text-red-700 text-right font-semibold'
  return 'text-muted-foreground text-right'
}

export function CurrencyMonthlyProfitTable({
  monthlyProfits,
  accounts,
}: CurrencyMonthlyProfitTableProps) {
  // 转换数据为矩阵格式
  const { currencies, months, matrix } = useMemo(() => {
    return transformToMatrix(monthlyProfits, accounts)
  }, [monthlyProfits, accounts])

  // 空状态处理
  if (monthlyProfits.length === 0) {
    return (
      <Card color="app-yellow">
        <div className="p-6 text-center text-muted-foreground">
          暂无月度收益数据
        </div>
      </Card>
    )
  }

  return (
    <Card color="app-yellow">
      <div className="p-6">
        <h3 className="text-lg font-bold text-white">各货币月度收益明细</h3>
      </div>
      <div className="px-6 pb-6 space-y-3">
        {currencies.map((currency) => {
          const config = CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG]
          const latestMonthProfit = matrix[currency]?.[months[months.length - 1]] || 0
          const isProfit = latestMonthProfit >= 0

          return (
            <Collapsible key={currency} asChild>
              <div className="border border-white/20 rounded-xl overflow-hidden bg-white/5">
                {/* 折叠触发器（点击行） */}
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <ChevronRightIcon className="h-5 w-5 text-white/70 transition-transform duration-200 [&[data-state=open]]:rotate-90" />
                      <span className="text-lg font-bold text-white">
                        {config?.label || currency}
                      </span>
                      <span className="text-xs text-white/70">
                        ({months.length} 个月数据)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-xl font-bold',
                          isProfit ? 'text-green-700' : 'text-red-700'
                        )}
                      >
                        {formatCurrency(latestMonthProfit, currency)}
                      </span>
                      <span className="text-xs text-white/70">最新月份</span>
                    </div>
                  </div>
                </CollapsibleTrigger>

                {/* 折叠内容（详细表格） */}
                <CollapsibleContent>
                  <div className="border-t border-white/10 p-4 overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-right p-2 text-sm font-bold text-white/80 w-24">
                            指标
                          </th>
                          {months.map((month) => (
                            <th
                              key={month}
                              className="text-right p-2 text-sm font-bold text-white/80 min-w-[100px]"
                            >
                              {formatMonth(month)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 font-semibold text-white/90 text-right">
                            收益
                          </td>
                          {months.map((month) => {
                            const profit = matrix[currency]?.[month] || 0
                            return (
                              <td key={month} className={cn('p-2 text-sm', getProfitColorClass(profit))}>
                                {formatCurrency(profit, currency)}
                              </td>
                            )
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}
      </div>
    </Card>
  )
}
