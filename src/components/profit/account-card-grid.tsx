'use client'

import { AccountCard } from './account-card'

interface AccountProfit {
  accountId: string
  accountName: string
  totalProfit: number
  profitRate: number
  startBalance: number
  endBalance: number
}

interface AccountCardGridProps {
  accountProfits: AccountProfit[]
}

export function AccountCardGrid({ accountProfits }: AccountCardGridProps) {
  if (accountProfits.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">暂无账户收益数据</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {accountProfits.map((accountProfit) => (
        <AccountCard key={accountProfit.accountId} data={accountProfit} />
      ))}
    </div>
  )
}
