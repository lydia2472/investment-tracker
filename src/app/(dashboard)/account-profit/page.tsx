'use client'

import { useMemo, useState } from 'react'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { DateFilterBar, type DateRange } from '@/components/dashboard/date-filter-bar'
import { AccountCardGrid } from '@/components/profit/account-card-grid'
import { AccountProfitChart } from '@/components/profit/account-profit-chart'
import { ProfitSummaryTable } from '@/components/profit/profit-summary-table'
import { ProfitRanking } from '@/components/profit/profit-ranking'
import { ProfitSummary } from '@/components/profit/profit-summary'
import { calculateMonthlyProfits } from '@/lib/utils/profit-calculator'

export default function AccountProfitPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  // 计算所有账户的月度收益
  const monthlyProfits = useMemo(() => {
    return calculateMonthlyProfits(transactions, accounts)
  }, [transactions, accounts])

  // 根据日期范围筛选数据
  const filteredProfits = useMemo(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) {
      return monthlyProfits
    }

    const startDate = dateRange.startDate
    const endDate = dateRange.endDate

    return monthlyProfits.filter((profit) => {
      const profitDate = new Date(profit.year, profit.month - 1)
      return profitDate >= startDate && profitDate <= endDate
    })
  }, [monthlyProfits, dateRange])

  // 按账户汇总收益
  const accountProfits = useMemo(() => {
    const accountMap = new Map<string, {
      accountId: string
      accountName: string
      totalProfit: number
      profitRate: number
      startBalance: number
      endBalance: number
    }>()

    filteredProfits.forEach((profit) => {
      const existing = accountMap.get(profit.accountId)

      if (existing) {
        existing.totalProfit += profit.calculatedProfit
        existing.endBalance = profit.endBalance
      } else {
        accountMap.set(profit.accountId, {
          accountId: profit.accountId,
          accountName: profit.accountName,
          totalProfit: profit.calculatedProfit,
          profitRate: profit.profitRate || 0,
          startBalance: profit.startBalance,
          endBalance: profit.endBalance,
        })
      }
    })

    return Array.from(accountMap.values())
  }, [filteredProfits])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">账户收益</h2>
        <p className="text-muted-foreground">
          查看各个账户的收益金额和收益率情况
        </p>
      </div>

      {/* 日期筛选栏 */}
      <DateFilterBar value={dateRange} onChange={setDateRange} />

      {/* 收益汇总 */}
      <ProfitSummary accountProfits={accountProfits} />

      {/* 账户卡片网格 */}
      <AccountCardGrid accountProfits={accountProfits} />

      {/* 收益趋势图 */}
      <AccountProfitChart monthlyProfits={filteredProfits} accounts={accounts} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* 收益汇总表格 */}
        <ProfitSummaryTable accountProfits={accountProfits} />

        {/* 收益排名 */}
        <ProfitRanking accountProfits={accountProfits} />
      </div>
    </div>
  )
}
