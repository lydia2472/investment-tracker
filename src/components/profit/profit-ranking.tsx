'use client'

import { Card } from 'animal-island-ui'

import { TrophyIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'
import { formatCurrencyCompact } from '@/lib/utils/formatters'

interface AccountProfit {
  accountId: string
  accountName: string
  totalProfit: number
  profitRate: number
  startBalance: number
  endBalance: number
}

interface ProfitRankingProps {
  accountProfits: AccountProfit[]
}

export function ProfitRanking({ accountProfits }: ProfitRankingProps) {
  // 按收益排序，取前5名
  const topAccounts = [...accountProfits].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 5)

  if (topAccounts.length === 0) {
    return (
      <Card color="app-blue">
        <div className="p-6 pb-3">
          <h3 className="font-semibold text-lg">收益排名</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-center py-8 text-muted-foreground">暂无排名数据</div>
        </div>
      </Card>
    )
  }

  const getRankEmoji = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}.`
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return TrophyIcon
    return null
  }

  return (
    <Card color="app-blue">
      <div className="p-6 pb-3">
        <h3 className="flex items-center gap-2">
          <TrophyIcon className="h-5 w-5 text-[#d4b030]" />
          收益 Top 5
        </h3>
      </div>
      <div className="p-6 pt-0">
        <div className="space-y-3">
          {topAccounts.map((account, index) => {
            const RankIcon = getRankIcon(index)
            const isPositive = account.totalProfit >= 0

            return (
              <div
                key={account.accountId}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl transition-all duration-200',
                  index === 0 && 'bg-gradient-to-r from-[#d4b030]/20 to-transparent',
                  index === 1 && 'bg-gradient-to-r from-[#c0c0c0]/20 to-transparent',
                  index === 2 && 'bg-gradient-to-r from-[#cd7f32]/20 to-transparent',
                  index > 2 && 'hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-8 text-center">{getRankEmoji(index)}</span>
                  {RankIcon && (
                    <RankIcon
                      className={cn(
                        'h-5 w-5',
                        index === 0 && 'text-[#d4b030]',
                        index === 1 && 'text-[#c0c0c0]',
                        index === 2 && 'text-[#cd7f32]'
                      )}
                    />
                  )}
                  <span className="font-medium">{account.accountName}</span>
                </div>

                <div className="text-right">
                  <div
                    className={cn(
                      'text-lg font-bold',
                      isPositive ? 'text-[#5ec850]' : 'text-[#ff6464]'
                    )}
                  >
                    {isPositive ? '+' : ''}💰 {formatCurrencyCompact(account.totalProfit)}
                  </div>
                  <div
                    className={cn(
                      'text-xs',
                      isPositive ? 'text-[#5ec850]/80' : 'text-[#ff6464]/80'
                    )}
                  >
                    {isPositive ? '+' : ''}
                    {account.profitRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
