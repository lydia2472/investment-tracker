'use client'

import { Divider } from 'animal-island-ui'
import { endOfMonth, startOfMonth } from 'date-fns'
import { startTransition, useDeferredValue, useMemo, useState } from 'react'

import { AccountDetailDialog } from '@/components/dashboard/account-detail-dialog'
import { AccountListPreview } from '@/components/dashboard/account-list-preview'
import { CurrencyAssetTrendChart } from '@/components/dashboard/currency-asset-trend-chart'
import { CurrencyAssetsCard } from '@/components/dashboard/currency-assets-card'
import { CurrencyExpenseCard } from '@/components/dashboard/currency-expense-card'
import { CurrencyIncomeCard } from '@/components/dashboard/currency-income-card'
import { CurrencyProfitCard } from '@/components/dashboard/currency-profit-card'
import { DateFilterBar } from '@/components/dashboard/date-filter-bar'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { MultiSelect } from '@/components/ui/multi-select'
import { useAccountStore, useTransactionStore, useSnapshotStore } from '@/lib/stores'
import { getAccountTypeLabel } from '@/lib/utils/account-helpers'
import { groupByCurrency } from '@/lib/utils/currency-helpers'
import { calculateProfitsByCurrency } from '@/lib/utils/currency-profit-helpers'
import { calculateMonthlyProfitsFromInvestmentTransactions } from '@/lib/utils/profit-calculator'

import type { DateRange } from '@/components/dashboard/date-filter-bar'
import type { Account } from '@/types'

export default function DashboardPage() {
  const allAccounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)
  const snapshots = useSnapshotStore((state) => state.snapshots)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  // 日期范围状态（undefined = 全部数据）
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const deferredDateRange = useDeferredValue(dateRange)

  // 账户类型多选筛选（空数组 = 全部类型）
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  const typeOptions = useMemo(
    () =>
      Array.from(new Set(allAccounts.map((a) => a.type))).map((t) => ({
        value: t,
        label: getAccountTypeLabel(t),
      })),
    [allAccounts]
  )

  const accounts = useMemo(
    () =>
      selectedTypes.length === 0
        ? allAccounts
        : allAccounts.filter((a) => selectedTypes.includes(a.type)),
    [allAccounts, selectedTypes]
  )

  // 计算「本月」= 最新快照所在月（而非日历当月）。
  // 这样在没有日历当月数据时，「本月」按钮仍能展示最近一期数据。
  const latestMonthRange = useMemo<DateRange | undefined>(() => {
    if (snapshots.length === 0) return undefined
    const latest = snapshots.reduce((max, s) => {
      const t = new Date(s.snapshotDate).getTime()
      return t > max ? t : max
    }, 0)
    if (!latest) return undefined
    const date = new Date(latest)
    return {
      startDate: startOfMonth(date),
      endDate: endOfMonth(date),
    }
  }, [snapshots])

  // 计算月度收益（只计算一次，避免重复）
  const monthlyProfits = useMemo(() => {
    return calculateMonthlyProfitsFromInvestmentTransactions(transactions, accounts)
  }, [transactions, accounts])

  // 计算多币种汇总
  const currencySummary = useMemo(() => {
    return groupByCurrency(accounts, transactions, deferredDateRange, snapshots)
  }, [accounts, transactions, deferredDateRange, snapshots])

  const profitsByCurrency = useMemo(() => {
    // 「全部」模式（无 dateRange）：不传 selectedYear/selectedMonth，
    // 让 calculateProfitsByCurrency 累加所有有快照月份的收益/亏损之和。
    // 「本月」/ 区间模式：通过 dateRange 筛选对应月份。
    return calculateProfitsByCurrency(
      monthlyProfits,
      accounts,
      undefined,
      undefined,
      deferredDateRange
    )
  }, [monthlyProfits, accounts, deferredDateRange])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">总览</h2>
        <p className="text-muted-foreground">查看您的资产概览和最近活动</p>
      </div>

      {/* 日期筛选栏 */}
      <DateFilterBar
        value={dateRange}
        onChange={(nextRange) => {
          startTransition(() => {
            setDateRange(nextRange)
          })
        }}
        latestMonthRange={latestMonthRange}
      />

      {/* 账户类型多选筛选（空 = 全部类型） */}
      {typeOptions.length > 1 && (
        <div className="flex items-center gap-3 pt-1">
          <span className="text-sm text-muted-foreground shrink-0">账户类型</span>
          <MultiSelect
            options={typeOptions}
            value={selectedTypes}
            onChange={setSelectedTypes}
            placeholder="全部类型（可多选筛选）"
            className="max-w-md"
          />
          {selectedTypes.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {accounts.length} / {allAccounts.length} 个账户
            </span>
          )}
        </div>
      )}

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      {/* 资产卡片 - 单独一行 */}
      <div className="grid gap-4 md:grid-cols-1">
        <CurrencyAssetsCard
          data={currencySummary}
          accounts={accounts}
          onAccountClick={setSelectedAccount}
          dateRange={deferredDateRange}
        />
      </div>

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      {/* 收益卡片 - 单独一行 */}
      <div className="grid gap-4 md:grid-cols-1">
        <CurrencyProfitCard
          profitData={profitsByCurrency}
          currencyData={currencySummary}
          dateRange={deferredDateRange}
          monthlyProfits={monthlyProfits}
          accounts={accounts}
        />
      </div>

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      {/* 收入和支出卡片 - 同一行 */}
      <div className="grid gap-4 md:grid-cols-2">
        <CurrencyIncomeCard data={currencySummary} dateRange={deferredDateRange} />
        <CurrencyExpenseCard data={currencySummary} dateRange={deferredDateRange} />
      </div>

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      {/* 各币种资产趋势面积图 */}
      <CurrencyAssetTrendChart
        monthlyProfits={monthlyProfits}
        accounts={accounts}
        transactions={transactions}
        dateRange={deferredDateRange}
        snapshots={snapshots}
      />

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      <div className="grid gap-6 md:grid-cols-2">
        <AccountListPreview accounts={accounts} limit={5} />
        <RecentTransactions
          transactions={
            selectedTypes.length === 0
              ? transactions
              : transactions.filter((txn) => accounts.some((a) => a.id === txn.accountId))
          }
          accounts={accounts}
          limit={5}
        />
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
