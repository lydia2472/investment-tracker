'use client'

import { useMemo, useState } from 'react'
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
import { CurrencyAssetTrendChart } from '@/components/dashboard/currency-asset-trend-chart'
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

  // 传递日期范围给 useAccountStats
  const stats = useAccountStats(dateRange)

  // 计算月度收益（只计算一次，避免重复）
  const monthlyProfits = useMemo(() => {
    return calculateMonthlyProfits(transactions, accounts)
  }, [transactions, accounts])

  // 计算日期范围内的收益汇总
  const profitSummary = useMemo(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) {
      // 无日期筛选：使用所有月度收益数据
      const allProfits = monthlyProfits

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
      const filteredProfits = monthlyProfits.filter((profit) => {
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
  }, [monthlyProfits, dateRange])

  const profitsByCurrency = useMemo(() => {
    return calculateProfitsByCurrency(
      monthlyProfits,
      accounts,
      undefined,
      undefined,
      dateRange                               // 传递日期范围
    )
  }, [monthlyProfits, accounts, dateRange])

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

      {/* 资产卡片 - 单独一行 */}
      <div className="grid gap-4 md:grid-cols-1">
        <CurrencyAssetsCard
          data={currencySummary}
          accounts={accounts}
          onAccountClick={setSelectedAccount}
          dateRange={dateRange}
        />
      </div>

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      {/* 收益卡片 - 单独一行 */}
      <div className="grid gap-4 md:grid-cols-1">
        <CurrencyProfitCard
          profitData={profitsByCurrency}
          currencyData={currencySummary}
          dateRange={dateRange}
          monthlyProfits={monthlyProfits}
          accounts={accounts}
        />
      </div>

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      {/* 收入和支出卡片 - 同一行 */}
      <div className="grid gap-4 md:grid-cols-2">
        <CurrencyIncomeCard
          data={currencySummary}
          dateRange={dateRange}
        />
        <CurrencyExpenseCard
          data={currencySummary}
          dateRange={dateRange}
        />
      </div>

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      {/* 各币种资产趋势面积图 */}
      <CurrencyAssetTrendChart
        monthlyProfits={monthlyProfits}
        accounts={accounts}
        dateRange={dateRange}
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
