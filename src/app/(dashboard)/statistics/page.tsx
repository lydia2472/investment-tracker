'use client'
import { useState, useMemo } from 'react'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { MonthlyProfitChart } from '@/components/statistics/monthly-profit-chart'
import { MonthlyProfitTable } from '@/components/statistics/monthly-profit-table'
import { calculateMonthlyProfits } from '@/lib/utils/profit-calculator'

export default function StatisticsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])

  // Account distribution data
  const accountData = accounts.map((account) => ({
    name: account.name,
    value: account.balance,
    color: account.color,
  }))

  // Income vs Expense data
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const incomeExpenseData = [
    { name: '总收入', 收入: totalIncome, 支出: 0 },
    { name: '总支出', 收入: 0, 支出: totalExpense },
  ]

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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">统计分析</h2>
        <p className="text-muted-foreground">
          查看您的财务数据和资产趋势
        </p>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">账户分布</TabsTrigger>
          <TabsTrigger value="income-expense">收支分析</TabsTrigger>
          <TabsTrigger value="monthly-profit">月度收益</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>账户资产分布</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income-expense" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>收入支出统计</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly-profit" className="space-y-4">
          {/* Account Filter */}
          <Card>
            <CardHeader>
              <CardTitle>账户筛选</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Monthly Profit Chart */}
          <Card>
            <CardHeader>
              <CardTitle>收益趋势图</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyProfitChart
                data={monthlyProfits}
                selectedAccounts={selectedAccounts}
              />
            </CardContent>
          </Card>

          {/* Monthly Profit Table */}
          <Card>
            <CardHeader>
              <CardTitle>月度收益详情</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyProfitTable
                data={monthlyProfits}
                selectedAccounts={selectedAccounts}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
