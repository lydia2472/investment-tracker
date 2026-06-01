'use client'
import { Card, Divider , Tabs } from 'animal-island-ui'
import { useState, useMemo, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { endOfMonth } from 'date-fns'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

import { ExchangeRateStatus } from '@/components/exchange-rate/exchange-rate-status'
import { MonthlyProfitChart } from '@/components/statistics/monthly-profit-chart'
import { MonthlyProfitTable } from '@/components/statistics/monthly-profit-table'
import { MonthlyIncomeExpenseTable } from '@/components/statistics/monthly-income-expense-table'
import { useAccountStore, useTransactionStore, useExchangeRateStore, useSnapshotStore } from '@/lib/stores'
import { getAccountTypeLabel } from '@/lib/utils/account-helpers'
import {
  groupAccountsByTypeInCNY,
  groupAccountsByRiskInCNY,
} from '@/lib/utils/currency-conversion-helpers'
import {
  calculateMonthlyProfits,
  aggregateMonthlyProfitsByMonth,
  calculateMonthlyIncomeExpense,
} from '@/lib/utils/profit-calculator'
import {
  getRiskLevelLabel,
  getRiskLevelColor,
  RISK_LEVEL_CONFIG,
} from '@/lib/utils/risk-level-helpers'
import { TransactionType, RiskLevel, AccountType, MonthlyIncomeExpense } from '@/types'

export default function StatisticsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)
  const { rates } = useExchangeRateStore()
  const addTransaction = useTransactionStore((state) => state.addTransaction)
  const snapshots = useSnapshotStore((state) => state.snapshots)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [autoCreateProfitTxns, setAutoCreateProfitTxns] = useState(true)

  // Account distribution data
  const accountData = accounts.map((account) => ({
    name: account.name,
    value: account.balance,
    color: account.color,
  }))

  // Risk distribution data
  const riskDistribution = useMemo(() => {
    const distribution = groupAccountsByRiskInCNY(accounts)

    return [
      {
        name: getRiskLevelLabel(RiskLevel.HIGH),
        value: distribution[RiskLevel.HIGH] || 0,
        color: getRiskLevelColor(RiskLevel.HIGH),
      },
      {
        name: getRiskLevelLabel(RiskLevel.MEDIUM),
        value: distribution[RiskLevel.MEDIUM] || 0,
        color: getRiskLevelColor(RiskLevel.MEDIUM),
      },
      {
        name: getRiskLevelLabel(RiskLevel.LOW),
        value: distribution[RiskLevel.LOW] || 0,
        color: getRiskLevelColor(RiskLevel.LOW),
      },
    ].filter((item) => item.value > 0)
  }, [accounts, rates])

  // Account type distribution data
  const accountTypeDistribution = useMemo(() => {
    const distribution = groupAccountsByTypeInCNY(accounts)

    return [
      {
        name: getAccountTypeLabel(AccountType.SECURITIES),
        value: distribution[AccountType.SECURITIES] || 0,
        color: '#3b82f6', // 蓝色
      },
      {
        name: getAccountTypeLabel(AccountType.BANK),
        value: distribution[AccountType.BANK] || 0,
        color: '#10b981', // 绿色
      },
      {
        name: getAccountTypeLabel(AccountType.CASH),
        value: distribution[AccountType.CASH] || 0,
        color: '#f59e0b', // 橙色
      },
      {
        name: getAccountTypeLabel(AccountType.FIXED_DEPOSIT),
        value: distribution[AccountType.FIXED_DEPOSIT] || 0,
        color: '#8b5cf6', // 紫色
      },
      {
        name: getAccountTypeLabel(AccountType.FUND),
        value: distribution[AccountType.FUND] || 0,
        color: '#ec4899', // 粉色
      },
      {
        name: getAccountTypeLabel(AccountType.STOCK),
        value: distribution[AccountType.STOCK] || 0,
        color: '#ef4444', // 红色
      },
      {
        name: getAccountTypeLabel(AccountType.GOLD),
        value: distribution[AccountType.GOLD] || 0,
        color: '#eab308', // 黄色
      },
      {
        name: getAccountTypeLabel(AccountType.OTHER),
        value: distribution[AccountType.OTHER] || 0,
        color: '#6b7280', // 灰色
      },
    ].filter((item) => item.value > 0) // 只显示有余额的类型
  }, [accounts, rates])

  // Calculate monthly profits
  const monthlyProfits = useMemo(() => {
    const allProfits = calculateMonthlyProfits(transactions, accounts)

    // 当选择"全部账户"时，按月份汇总
    if (selectedAccounts.length === 0) {
      return aggregateMonthlyProfitsByMonth(allProfits)
    }

    // 当选择特定账户时，返回原始数据（由组件内部过滤）
    return allProfits
  }, [transactions, accounts, selectedAccounts])

  // Auto-create profit transactions from snapshots
  useEffect(() => {
    if (!autoCreateProfitTxns) return

    // Get all account profits
    const allProfits = calculateMonthlyProfits(transactions, accounts)

    // For each profit, check if a corresponding investment profit transaction exists
    allProfits.forEach((profit) => {
      // Skip if profit is zero
      if (profit.calculatedProfit === 0) return

      // Skip if it's from incomplete data (no snapshot pair)
      if (!profit.hasCompleteData) return

      // Determine transaction type based on profit sign
      const txnType = profit.calculatedProfit > 0
        ? TransactionType.INVESTMENT_PROFIT
        : TransactionType.INVESTMENT_LOSS

      // Check if a profit/loss transaction already exists for this month/account
      const monthStart = new Date(profit.year, profit.month - 1, 1)
      const monthEnd = endOfMonth(monthStart)

      const existingTxn = transactions.find((t) => {
        if (t.accountId !== profit.accountId) return false
        if (t.type !== txnType) return false
        if (!t.createdAt) return false

        const txnDate = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)
        return txnDate >= monthStart && txnDate <= monthEnd
      })

      // If no existing transaction, create one
      if (!existingTxn) {
        const txnDate = monthEnd
        txnDate.setHours(23, 59, 59, 999)

        const absProfit = Math.abs(profit.calculatedProfit)
        const profitType = profit.calculatedProfit > 0 ? '收益' : '亏损'

        addTransaction({
          accountId: profit.accountId,
          type: txnType,
          amount: absProfit,
          balance: profit.endBalance,
          description: `${profit.year}年${profit.month}月投资${profitType}（自动生成）`,
          tags: ['投资收益', '自动生成'],
          createdAt: txnDate,
        })

        console.log(`[自动创建] 为 ${profit.accountName} 创建 ${profit.year}年${profit.month}月 ${profitType}交易: ${absProfit.toFixed(2)}元`)
      }
    })
  }, [transactions, accounts, autoCreateProfitTxns])

  // Auto-create profit transactions from snapshot-store
  useEffect(() => {
    if (!autoCreateProfitTxns) return
    if (snapshots.length === 0) return

    // Group snapshots by account
    const snapshotsByAccount = new Map<string, typeof snapshots>()
    snapshots.forEach((snapshot) => {
      if (!snapshotsByAccount.has(snapshot.accountId)) {
        snapshotsByAccount.set(snapshot.accountId, [])
      }
      snapshotsByAccount.get(snapshot.accountId)!.push(snapshot)
    })

    // For each account, calculate profits from snapshots
    snapshotsByAccount.forEach((accountSnapshots, accountId) => {
      // Sort by date descending (newest first)
      const sortedSnapshots = [...accountSnapshots].sort((a, b) =>
        new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
      )

      // Calculate profit for each pair of consecutive snapshots
      for (let i = 0; i < sortedSnapshots.length - 1; i++) {
        const currentSnapshot = sortedSnapshots[i]
        const previousSnapshot = sortedSnapshots[i + 1]

        // Calculate profit
        const profit = currentSnapshot.balance - previousSnapshot.balance

        // Skip if profit is zero
        if (profit === 0) continue

        // Determine month from previous snapshot date
        // If snapshot is on 1st day (like May 1st), it represents end of previous month (April)
        const snapshotDate = new Date(previousSnapshot.snapshotDate)
        let monthStart: Date
        let monthEnd: Date
        let year: number
        let month: number

        if (snapshotDate.getDate() === 1) {
          // 5月1日的快照代表4月月末
          monthStart = new Date(snapshotDate.getFullYear(), snapshotDate.getMonth() - 1, 1)
          monthEnd = new Date(snapshotDate.getFullYear(), snapshotDate.getMonth(), 0) // 上月最后一天
          monthEnd.setHours(23, 59, 59, 999)
          year = monthStart.getFullYear()
          month = monthStart.getMonth() + 1 // 1-based month for display
        } else {
          // 其他日期使用正常逻辑
          monthStart = new Date(snapshotDate.getFullYear(), snapshotDate.getMonth(), 1)
          monthEnd = endOfMonth(monthStart)
          year = snapshotDate.getFullYear()
          month = snapshotDate.getMonth() + 1
        }

        // Determine transaction type
        const txnType = profit > 0
          ? TransactionType.INVESTMENT_PROFIT
          : TransactionType.INVESTMENT_LOSS

        // Check if transaction already exists for this month
        const existingTxn = transactions.find((t) => {
          if (t.accountId !== accountId) return false
          if (t.type !== txnType) return false
          if (!t.createdAt) return false

          const txnDate = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)
          return txnDate >= monthStart && txnDate <= monthEnd
        })

        // Create transaction if doesn't exist
        if (!existingTxn) {
          const account = accounts.find((a) => a.id === accountId)
          const accountName = account?.name || accountId

          const absProfit = Math.abs(profit)
          const profitType = profit > 0 ? '收益' : '亏损'

          addTransaction({
            accountId,
            type: txnType,
            amount: absProfit,
            balance: currentSnapshot.balance,
            description: `${year}年${month}月投资${profitType}（从快照自动生成）`,
            tags: ['投资收益', '快照生成'],
            createdAt: monthEnd,
          })

          console.log(`[快照生成] 为 ${accountName} 创建 ${year}年${month}月 ${profitType}交易: ${absProfit.toFixed(2)}元`)
        }
      }
    })
  }, [snapshots, accounts, transactions, autoCreateProfitTxns])

  // Calculate monthly income/expense data
  const monthlyIncomeExpenseData = useMemo(() => {
    // 根据选中的账户筛选交易
    let filteredTransactions = transactions
    if (selectedAccounts.length > 0) {
      filteredTransactions = transactions.filter((t) =>
        selectedAccounts.includes(t.accountId)
      )
    }
    return calculateMonthlyIncomeExpense(filteredTransactions)
  }, [transactions, selectedAccounts])

  // Calculate chart data for bar chart (sorted by month ascending)
  const incomeExpenseChartData = useMemo(() => {
    // 按月份升序排序（旧→新）
    const sortedData = [...monthlyIncomeExpenseData].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

    return sortedData.map((item) => ({
      month: item.monthLabel,
      收入: item.totalIncome,
      支出: item.totalExpense,
    }))
  }, [monthlyIncomeExpenseData])

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    setSelectedAccounts((prev) => {
      if (prev.includes(accountId)) {
        return prev.filter((id) => id !== accountId)
      } else {
        return [...prev, accountId]
      }
    })
  }

  return (
    <div className="space-y-6">
      <ExchangeRateStatus />
      <div>
        <h2 className="text-3xl font-bold tracking-tight">统计分析</h2>
        <p className="text-muted-foreground">查看您的财务数据和资产趋势</p>
      </div>

      <Tabs
        items={[
          {
            key: 'accounts',
            label: '账户分布',
            children: (
              <div className="space-y-4">
                <Card color="app-yellow">
                  <div className="p-6 pb-3">
                    <h3 className="font-semibold text-lg">账户资产分布</h3>
                  </div>
                  <div className="p-6 pt-0">
                    {accounts.length === 0 ? (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        暂无数据
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={accountData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                            }
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {accountData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [
                              `¥${Number(value ?? 0).toFixed(2)}`,
                              '余额',
                            ]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>
              </div>
            ),
          },
          {
            key: 'income-expense',
            label: '收支分析',
            children: (
              <div className="space-y-4">
                <Card color="app-yellow">
                  <div className="p-6 pb-3">
                    <h3 className="font-semibold text-lg">收入支出统计</h3>
                  </div>
                  <div className="p-6 pt-0">
                    {transactions.length === 0 ? (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        暂无数据
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={incomeExpenseChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip
                            formatter={(value: any) => `¥${Number(value ?? 0).toFixed(2)}`}
                          />
                          <Legend />
                          <Bar dataKey="收入" fill="#10b981" />
                          <Bar dataKey="支出" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>

                <Card color="app-yellow">
                  <div className="p-6 pb-3">
                    <h3 className="font-semibold text-lg">月度收支明细</h3>
                    <p className="text-sm text-muted-foreground">
                      按月统计收入和支出分类汇总
                    </p>
                  </div>
                  <div className="p-6 pt-0">
                    <MonthlyIncomeExpenseTable data={monthlyIncomeExpenseData} />
                  </div>
                </Card>
              </div>
            ),
          },
          {
            key: 'monthly-profit',
            label: '月度收益',
            children: (
              <div className="space-y-4">
                {/* Account Filter */}
                <Card color="app-yellow">
                  <div className="p-6 pb-3">
                    <h3 className="font-semibold text-lg">账户筛选</h3>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedAccounts([])}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          selectedAccounts.length === 0
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        全部账户
                      </button>
                      {accounts.map((account) => (
                        <button
                          key={account.id}
                          onClick={() => toggleAccount(account.id)}
                          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            selectedAccounts.includes(account.id)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {account.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                <Divider type="line-yellow" style={{ margin: '24px 0' }} />

                {/* Monthly Profit Chart */}
                <Card color="app-yellow">
                  <div className="p-6 pb-3">
                    <h3 className="font-semibold text-lg">收益趋势图</h3>
                  </div>
                  <div className="p-6 pt-0">
                    <MonthlyProfitChart data={monthlyProfits} selectedAccounts={selectedAccounts} />
                  </div>
                </Card>

                <Divider type="line-yellow" style={{ margin: '24px 0' }} />

                {/* Monthly Profit Table */}
                <Card color="app-yellow">
                  <div className="p-6 pb-3">
                    <h3 className="font-semibold text-lg">月度收益详情</h3>
                  </div>
                  <div className="p-6 pt-0">
                    <MonthlyProfitTable data={monthlyProfits} selectedAccounts={selectedAccounts} />
                  </div>
                </Card>
              </div>
            ),
          },
          {
            key: 'risk-analysis',
            label: '风险分析',
            children: (
              <div className="space-y-4">
                <Card color="app-yellow">
                  <div className="p-6 pb-3">
                    <h3 className="font-semibold text-lg">资产风险分布</h3>
                  </div>
                  <div className="p-6 pt-0">
                    {accounts.length === 0 ? (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        暂无数据
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={riskDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                            }
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {riskDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [
                              `¥${Number(value ?? 0).toFixed(2)}`,
                              '资产',
                            ]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>
              </div>
            ),
          },
          {
            key: 'account-type-analysis',
            label: '账户类型分析',
            children: (
              <div className="space-y-4">
                <Card color="app-yellow">
                  <div className="p-6 pb-3">
                    <h3 className="font-semibold text-lg">账户类型资产分布</h3>
                  </div>
                  <div className="p-6 pt-0">
                    {accounts.length === 0 ? (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        暂无数据
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={accountTypeDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                            }
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {accountTypeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [
                              `¥${Number(value ?? 0).toFixed(2)}`,
                              '资产',
                            ]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>
              </div>
            ),
          },
        ]}
        defaultActiveKey="accounts"
      />
    </div>
  )
}
