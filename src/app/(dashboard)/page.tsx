'use client'

import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { useAccountStats } from '@/hooks/use-account-stats'
import { StatsCard } from '@/components/dashboard/stats-card'
import { AccountListPreview } from '@/components/dashboard/account-list-preview'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

export default function DashboardPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)

  const stats = useAccountStats()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">总览</h2>
        <p className="text-muted-foreground">
          查看您的资产概览和最近活动
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="总资产"
          value={stats.totalAssets}
          icon={Wallet}
          description={`${stats.accountCount} 个账户`}
          variant="green"
        />
        <StatsCard
          title="总收入"
          value={stats.totalIncome}
          icon={TrendingUp}
          description="累计收入"
          variant="green"
        />
        <StatsCard
          title="总支出"
          value={stats.totalExpense}
          icon={TrendingDown}
          description="累计支出"
          variant="red"
        />
        <StatsCard
          title="净资产"
          value={stats.netIncome}
          icon={DollarSign}
          description="收支差额"
          variant="gold"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AccountListPreview accounts={accounts} limit={5} />
        <RecentTransactions transactions={transactions} accounts={accounts} limit={5} />
      </div>
    </div>
  )
}
