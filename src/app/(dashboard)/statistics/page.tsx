'use client'
import { useState, useMemo } from 'react'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { Card, Divider } from 'animal-island-ui'
import { Tabs } from 'animal-island-ui'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { MonthlyProfitChart } from '@/components/statistics/monthly-profit-chart'
import { MonthlyProfitTable } from '@/components/statistics/monthly-profit-table'
import { calculateMonthlyProfits } from '@/lib/utils/profit-calculator'
import { TransactionType, RiskLevel, AccountType } from '@/types'
import { getRiskLevelLabel, getRiskLevelColor, RISK_LEVEL_CONFIG } from '@/lib/utils/risk-level-helpers'
import { getAccountTypeLabel } from '@/lib/utils/account-helpers'
import { useExchangeRateStore } from '@/lib/stores'
import {
  groupAccountsByTypeInCNY,
  groupAccountsByRiskInCNY,
} from '@/lib/utils/currency-conversion-helpers'
import { ExchangeRateStatus } from '@/components/exchange-rate/exchange-rate-status'

export default function StatisticsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)
  const { rates } = useExchangeRateStore()
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])

  // Account distribution data
  const accountData = accounts.map((account) => ({
    name: account.name,
    value: account.balance,
    color: account.color,
  }))

  // Income vs Expense data
  const totalIncome = transactions
    .filter(t => t.type === TransactionType.INCOME || t.type === TransactionType.DEPOSIT)
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const totalExpense = transactions
    .filter(t => t.type === TransactionType.CONSUMPTION)
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const incomeExpenseData = [
    { name: '总收入', 收入: totalIncome, 支出: 0 },
    { name: '总支出', 收入: 0, 支出: totalExpense },
  ]

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
    return calculateMonthlyProfits(transactions, accounts)
  }, [transactions, accounts])

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
        <p className="text-muted-foreground">
          查看您的财务数据和资产趋势
        </p>
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
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {accountData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => [`¥${Number(value ?? 0).toFixed(2)}`, '余额']} />
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
                        <BarChart data={incomeExpenseData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => `¥${Number(value ?? 0).toFixed(2)}`} />
                          <Legend />
                          <Bar dataKey="收入" fill="#10b981" />
                          <Bar dataKey="支出" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
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
                    <MonthlyProfitChart
                      data={monthlyProfits}
                      selectedAccounts={selectedAccounts}
                    />
                  </div>
                </Card>

                <Divider type="line-yellow" style={{ margin: '24px 0' }} />

                {/* Monthly Profit Table */}
                <Card color="app-yellow">
                  <div className="p-6 pb-3">
                    <h3 className="font-semibold text-lg">月度收益详情</h3>
                  </div>
                  <div className="p-6 pt-0">
                    <MonthlyProfitTable
                      data={monthlyProfits}
                      selectedAccounts={selectedAccounts}
                    />
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
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {riskDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => [`¥${Number(value ?? 0).toFixed(2)}`, '资产']} />
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
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {accountTypeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => [`¥${Number(value ?? 0).toFixed(2)}`, '资产']} />
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
