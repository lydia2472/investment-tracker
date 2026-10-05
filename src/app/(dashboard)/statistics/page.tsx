'use client'
import { Card, Divider , Tabs } from 'animal-island-ui'
import { startTransition, useDeferredValue, useMemo, useState } from 'react'
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

import { DateFilterBar } from '@/components/dashboard/date-filter-bar'
import { ExchangeRateStatus } from '@/components/exchange-rate/exchange-rate-status'
import { MonthlyIncomeExpenseTable } from '@/components/statistics/monthly-income-expense-table'
import { MonthlyProfitChart } from '@/components/statistics/monthly-profit-chart'
import { MonthlyProfitTable } from '@/components/statistics/monthly-profit-table'
import { useAccountStore, useSnapshotStore, useTransactionStore } from '@/lib/stores'
import { getAccountTypeLabel } from '@/lib/utils/account-helpers'
import { convertBalanceToCNY } from '@/lib/utils/currency-conversion-helpers'
import {
  calculateMonthlyIncomeExpense,
  calculateMonthlyProfitsFromInvestmentTransactions,
} from '@/lib/utils/profit-calculator'
import { getRiskLevelLabel } from '@/lib/utils/risk-level-helpers'
import { getAccountBalanceAtDate } from '@/lib/utils/snapshot-balance-helpers'
import { RiskLevel, AccountType } from '@/types'

import type { DateRange } from '@/components/dashboard/date-filter-bar'

const PIE_CHART_COLORS = [
  '#1d4ed8',
  '#047857',
  '#c2410c',
  '#be123c',
  '#6d28d9',
  '#0f766e',
  '#a16207',
  '#9d174d',
  '#4338ca',
  '#15803d',
]

const PIE_LABEL_COLOR = '#020617'
const PIE_LABEL_STROKE = '#fffaf0'
const PIE_LEGEND_COLOR = '#0f172a'
const PIE_TOOLTIP_STYLE = {
  backgroundColor: '#fffdf5',
  border: '1px solid #d6d3c4',
  borderRadius: '12px',
  color: '#0f172a',
}
const RADIAN = Math.PI / 180

const RISK_PIE_COLORS: Record<RiskLevel, string> = {
  [RiskLevel.HIGH]: '#b91c1c',
  [RiskLevel.MEDIUM]: '#a16207',
  [RiskLevel.LOW]: '#15803d',
}

export default function StatisticsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)
  const snapshots = useSnapshotStore((state) => state.snapshots)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const deferredDateRange = useDeferredValue(dateRange)
  const effectiveEndDate = deferredDateRange?.endDate

  const balancesByAccountId = useMemo(() => {
    return new Map(
      accounts.map((account) => {
        // 始终用 getAccountBalanceAtDate：无 endDate 时它取最新快照（真实市值），
        // 不用 account.balance（后者是交易累加值，投资类账户会严重高估）。
        const balance = getAccountBalanceAtDate(transactions, account, effectiveEndDate, snapshots)
        return [account.id, balance]
      })
    )
  }, [accounts, transactions, effectiveEndDate, snapshots])

  // Account distribution data
  const accountData = useMemo(
    () =>
      accounts
        .map((account, index) => ({
          name: account.name,
          value: balancesByAccountId.get(account.id) || 0,
          color: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length],
        }))
        .filter((account) => account.value > 0),
    [accounts, balancesByAccountId]
  )

  // Risk distribution data
  const riskDistribution = useMemo(() => {
    const distribution = accounts.reduce(
      (acc, account) => {
        if (!account.riskLevel) {
          return acc
        }

        const balance = balancesByAccountId.get(account.id) || 0
        const cnyAmount = convertBalanceToCNY(balance, account.currency)
        acc[account.riskLevel] = (acc[account.riskLevel] || 0) + cnyAmount
        return acc
      },
      {} as Record<string, number>
    )

    return [
      {
        name: getRiskLevelLabel(RiskLevel.HIGH),
        value: distribution[RiskLevel.HIGH] || 0,
        color: RISK_PIE_COLORS[RiskLevel.HIGH],
      },
      {
        name: getRiskLevelLabel(RiskLevel.MEDIUM),
        value: distribution[RiskLevel.MEDIUM] || 0,
        color: RISK_PIE_COLORS[RiskLevel.MEDIUM],
      },
      {
        name: getRiskLevelLabel(RiskLevel.LOW),
        value: distribution[RiskLevel.LOW] || 0,
        color: RISK_PIE_COLORS[RiskLevel.LOW],
      },
    ].filter((item) => item.value > 0)
  }, [accounts, balancesByAccountId])

  // Account type distribution data
  const accountTypeDistribution = useMemo(() => {
    const distribution = accounts.reduce(
      (acc, account) => {
        const balance = balancesByAccountId.get(account.id) || 0
        const cnyAmount = convertBalanceToCNY(balance, account.currency)
        acc[account.type] = (acc[account.type] || 0) + cnyAmount
        return acc
      },
      {} as Record<string, number>
    )

    return [
      {
        name: getAccountTypeLabel(AccountType.SECURITIES),
        value: distribution[AccountType.SECURITIES] || 0,
        color: '#1d4ed8', // 深蓝
      },
      {
        name: getAccountTypeLabel(AccountType.BANK),
        value: distribution[AccountType.BANK] || 0,
        color: '#047857', // 深绿
      },
      {
        name: getAccountTypeLabel(AccountType.CASH),
        value: distribution[AccountType.CASH] || 0,
        color: '#c2410c', // 深橙
      },
      {
        name: getAccountTypeLabel(AccountType.FIXED_DEPOSIT),
        value: distribution[AccountType.FIXED_DEPOSIT] || 0,
        color: '#6d28d9', // 深紫
      },
      {
        name: getAccountTypeLabel(AccountType.FUND),
        value: distribution[AccountType.FUND] || 0,
        color: '#be185d', // 深粉
      },
      {
        name: getAccountTypeLabel(AccountType.STOCK),
        value: distribution[AccountType.STOCK] || 0,
        color: '#b91c1c', // 深红
      },
      {
        name: getAccountTypeLabel(AccountType.GOLD),
        value: distribution[AccountType.GOLD] || 0,
        color: '#a16207', // 深金色
      },
      {
        name: getAccountTypeLabel(AccountType.OTHER),
        value: distribution[AccountType.OTHER] || 0,
        color: '#334155', // 深灰蓝
      },
    ].filter((item) => item.value > 0) // 只显示有余额的类型
  }, [accounts, balancesByAccountId])

  // Calculate monthly profits
  const monthlyProfits = useMemo(() => {
    // 统一使用投资收益交易计算（支持账户筛选）
    return calculateMonthlyProfitsFromInvestmentTransactions(
      transactions,
      accounts,
      selectedAccounts.length > 0 ? selectedAccounts : undefined
    )
  }, [transactions, accounts, selectedAccounts])

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

  const renderPieLabel = ({
    cx = 0,
    cy = 0,
    midAngle = 0,
    outerRadius = 0,
    percent = 0,
    name = '',
  }: {
    cx?: number
    cy?: number
    midAngle?: number
    outerRadius?: number
    percent?: number
    name?: string
  }) => {
    const radius = outerRadius + 22
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill={PIE_LABEL_COLOR}
        fontSize={14}
        fontWeight={700}
        stroke={PIE_LABEL_STROKE}
        strokeWidth={3}
        paintOrder="stroke"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {`${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
      </text>
    )
  }

  const renderLegendText = (value: string) => (
    <span style={{ color: PIE_LEGEND_COLOR, fontWeight: 700, fontSize: '14px' }}>{value}</span>
  )

  return (
    <div className="space-y-6">
      <ExchangeRateStatus />
      <div>
        <h2 className="text-3xl font-bold tracking-tight">统计分析</h2>
        <p className="text-muted-foreground">查看您的财务数据和资产趋势</p>
      </div>

      <DateFilterBar
        value={dateRange}
        onChange={(nextRange) => {
          startTransition(() => {
            setDateRange(nextRange)
          })
        }}
      />

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

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
                            label={renderPieLabel}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {accountData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={PIE_TOOLTIP_STYLE}
                            itemStyle={{ color: PIE_LABEL_COLOR }}
                            formatter={(value) => [
                              `¥${Number(value ?? 0).toFixed(2)}`,
                              '余额',
                            ]}
                          />
                          <Legend
                            formatter={renderLegendText}
                            wrapperStyle={{ color: PIE_LEGEND_COLOR, paddingTop: '12px' }}
                          />
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
                    <h3 className="font-semibold text-lg">收支统计</h3>
                  </div>
                  <div className="p-6 pt-0">
                    {monthlyIncomeExpenseData.length === 0 ? (
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
                            formatter={(value) =>
                              `¥${Number(value ?? 0).toFixed(2)}`
                            }
                          />
                          <Legend />
                          <Bar dataKey="收入" fill="#22c55e" />
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
                      按月统计收入、支出与投资净收益汇总
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
                            label={renderPieLabel}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {riskDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={PIE_TOOLTIP_STYLE}
                            itemStyle={{ color: PIE_LABEL_COLOR }}
                            formatter={(value) => [
                              `¥${Number(value ?? 0).toFixed(2)}`,
                              '资产',
                            ]}
                          />
                          <Legend
                            formatter={renderLegendText}
                            wrapperStyle={{ color: PIE_LEGEND_COLOR, paddingTop: '12px' }}
                          />
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
                            label={renderPieLabel}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {accountTypeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={PIE_TOOLTIP_STYLE}
                            itemStyle={{ color: PIE_LABEL_COLOR }}
                            formatter={(value) => [
                              `¥${Number(value ?? 0).toFixed(2)}`,
                              '资产',
                            ]}
                          />
                          <Legend
                            formatter={renderLegendText}
                            wrapperStyle={{ color: PIE_LEGEND_COLOR, paddingTop: '12px' }}
                          />
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
