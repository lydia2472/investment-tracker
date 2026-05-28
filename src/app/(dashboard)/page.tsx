'use client'

import { useMemo, useState, useEffect } from 'react'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { useAccountStats } from '@/hooks/use-account-stats'
import { Divider } from 'animal-island-ui'
import type { DateRange } from '@/components/dashboard/date-filter-bar'
import { DateFilterBar } from '@/components/dashboard/date-filter-bar'
import { AccountListPreview } from '@/components/dashboard/account-list-preview'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { CurrencyAssetsCard } from '@/components/dashboard/currency-assets-card'
import { CurrencyIncomeCard } from '@/components/dashboard/currency-income-card'
import { CurrencyExpenseCard } from '@/components/dashboard/currency-expense-card'
import { CurrencyProfitCard } from '@/components/dashboard/currency-profit-card'
import { CurrencyMonthlyProfitTable } from '@/components/dashboard/currency-monthly-profit-table'
import { AccountDetailDialog } from '@/components/dashboard/account-detail-dialog'
import { calculateMonthlyProfits } from '@/lib/utils/profit-calculator'
import { groupByCurrency } from '@/lib/utils/currency-helpers'
import { calculateProfitsByCurrency } from '@/lib/utils/currency-profit-helpers'
import type { Account } from '@/types'

export default function DashboardPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  // 日期范围状态（undefined = 全部数据）
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  // 月份选择状态（用于货币收益筛选）
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined)
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined)

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

  // 计算月度收益和货币收益统计
  const monthlyProfits = useMemo(() => {
    return calculateMonthlyProfits(transactions, accounts)
  }, [transactions, accounts])

  // 计算可用的月份列表（用于筛选器）
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>()
    monthlyProfits.forEach(p => {
      monthsSet.add(`${p.year}-${p.month}`)
    })
    return Array.from(monthsSet)
      .sort()
      .reverse()  // 最新月份在前
  }, [monthlyProfits])

  // 初始化为最新月份（当数据加载完成且未选择月份时自动设置）
  useEffect(() => {
    if (monthlyProfits.length > 0 && !selectedYear && !selectedMonth) {
      const latest = monthlyProfits[monthlyProfits.length - 1]
      setSelectedYear(latest.year)
      setSelectedMonth(latest.month)
    }
  }, [monthlyProfits, selectedYear, selectedMonth]) // 监听数据变化和当前选择

  const profitsByCurrency = useMemo(() => {
    return calculateProfitsByCurrency(
      monthlyProfits,
      accounts,
      dateRange ? undefined : selectedYear,   // dateRange 优先
      dateRange ? undefined : selectedMonth,  // dateRange 优先
      dateRange                               // 传递日期范围
    )
  }, [monthlyProfits, accounts, selectedYear, selectedMonth, dateRange])

  // 计算多币种汇总
  const currencySummary = useMemo(() => {
    // 按日期筛选交易
    const filteredTransactions = (() => {
      if (!dateRange?.startDate && !dateRange?.endDate) {
        return transactions
      }
      return transactions.filter(t => {
        const txnDate = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)
        if (dateRange.startDate && txnDate < dateRange.startDate) return false
        if (dateRange.endDate && txnDate > dateRange.endDate) return false
        return true
      })
    })()

    return groupByCurrency(accounts, filteredTransactions, dateRange?.endDate)
  }, [accounts, transactions, dateRange])

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

      <div className="grid gap-4 md:grid-cols-2">
        <CurrencyAssetsCard
          data={currencySummary}
          accounts={accounts}
          onAccountClick={setSelectedAccount}
          dateRange={dateRange}
        />
        <CurrencyIncomeCard
          data={currencySummary}
          dateRange={dateRange}
        />
      </div>

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      <div className="grid gap-4 md:grid-cols-2">
        <CurrencyExpenseCard
          data={currencySummary}
          dateRange={dateRange}
        />
        <CurrencyProfitCard
          profitData={profitsByCurrency}
          currencyData={currencySummary}
          availableMonths={availableMonths}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
          dateRange={dateRange}
        />
      </div>

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      {/* 各货币月度收益明细 */}
      <CurrencyMonthlyProfitTable
        monthlyProfits={monthlyProfits}
        accounts={accounts}
      />

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      <div className="grid gap-6 md:grid-cols-2">
        <AccountListPreview accounts={accounts} limit={5} />
        <RecentTransactions transactions={transactions} accounts={accounts} limit={5} />
      </div>

      {/* 账户明细弹窗 */}
      <AccountDetailDialog
        account={selectedAccount}
        transactions={transactions}
        open={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
      />
    </div>
  )
}
