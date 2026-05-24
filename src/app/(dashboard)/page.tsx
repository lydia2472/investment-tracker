'use client'

import { useMemo, useState } from 'react'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { useAccountStats } from '@/hooks/use-account-stats'
import { Divider } from 'animal-island-ui'
import type { DateRange } from '@/components/dashboard/date-filter-bar'
import { DateFilterBar } from '@/components/dashboard/date-filter-bar'
import { StatsCard } from '@/components/dashboard/stats-card'
import { ProfitCard } from '@/components/dashboard/profit-card'
import { RateOfReturnCard } from '@/components/dashboard/rate-of-return-card'
import { AccountListPreview } from '@/components/dashboard/account-list-preview'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { ShellIcon, TrendingUpIcon, TrendingDownIcon } from '@/lib/components/icon-adapter'
import { calculateMonthlyProfits } from '@/lib/utils/profit-calculator'

export default function DashboardPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)

  // 日期范围状态（undefined = 全部数据）
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  // 传递日期范围给 useAccountStats
  const stats = useAccountStats(dateRange)

  // 计算日期范围内的收益汇总
  const profitSummary = useMemo(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) {
      // 无日期筛选：使用所有月度收益数据
      const allProfits = calculateMonthlyProfits(transactions, accounts)

      if (allProfits.length === 0) {
        return {
          totalProfit: 0,
          profitRate: 0,
          hasData: false,
        }
      }

      const totalProfit = allProfits.reduce((sum, p) => sum + p.calculatedProfit, 0)
      const totalStartBalance = allProfits.reduce((sum, p) => sum + p.startBalance, 0)
      const weightedProfitRate = totalStartBalance > 0
        ? allProfits.reduce((sum, p) => {
            const weight = p.startBalance / totalStartBalance
            return sum + (p.profitRate || 0) * weight
          }, 0)
        : 0

      return {
        totalProfit,
        profitRate: weightedProfitRate,
        hasData: true,
      }
    } else {
      // 有日期筛选：计算指定范围内的收益
      const startYear = dateRange.startDate.getFullYear()
      const startMonth = dateRange.startDate.getMonth() + 1
      const endYear = dateRange.endDate.getFullYear()
      const endMonth = dateRange.endDate.getMonth() + 1

      // 筛选该日期范围内的月度收益
      const allProfits = calculateMonthlyProfits(transactions, accounts)
      const filteredProfits = allProfits.filter((profit) => {
        const profitDate = new Date(profit.year, profit.month - 1)
        const startDate = new Date(startYear, startMonth - 1)
        const endDate = new Date(endYear, endMonth - 1)
        return profitDate >= startDate && profitDate <= endDate
      })

      if (filteredProfits.length === 0) {
        return {
          totalProfit: 0,
          profitRate: 0,
          hasData: false,
        }
      }

      const totalProfit = filteredProfits.reduce((sum, p) => sum + p.calculatedProfit, 0)
      const totalStartBalance = filteredProfits.reduce((sum, p) => sum + p.startBalance, 0)
      const weightedProfitRate = totalStartBalance > 0
        ? filteredProfits.reduce((sum, p) => {
            const weight = p.startBalance / totalStartBalance
            return sum + (p.profitRate || 0) * weight
          }, 0)
        : 0

      return {
        totalProfit,
        profitRate: weightedProfitRate,
        hasData: true,
      }
    }
  }, [transactions, accounts, dateRange])

  // 根据日期筛选状态显示不同的描述文本
  const incomeDescription = dateRange ? '筛选范围收入' : '累计收入'
  const expenseDescription = dateRange ? '筛选范围支出' : '累计支出'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">总览</h2>
        <p className="text-muted-foreground">
          查看您的资产概览和最近活动
        </p>
      </div>

      {/* 日期筛选栏 */}
      <DateFilterBar value={dateRange} onChange={setDateRange} />

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="总资产"
          value={stats.totalAssets}
          icon={ShellIcon}
          description={`${stats.accountCount} 个账户`}
          variant="green"
        />
        <StatsCard
          title="总收入"
          value={stats.totalIncome}
          icon={TrendingUpIcon}
          description={incomeDescription}
          variant="green"
        />
        <StatsCard
          title="总支出"
          value={stats.totalExpense}
          icon={TrendingDownIcon}
          description={expenseDescription}
          variant="red"
        />
      </div>

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      <div className="grid gap-4 md:grid-cols-2">
        <ProfitCard data={profitSummary} />
        <RateOfReturnCard
          profitRate={profitSummary.profitRate}
          hasData={profitSummary.hasData}
        />
      </div>

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      <div className="grid gap-6 md:grid-cols-2">
        <AccountListPreview accounts={accounts} limit={5} />
        <RecentTransactions transactions={transactions} accounts={accounts} limit={5} />
      </div>
    </div>
  )
}
