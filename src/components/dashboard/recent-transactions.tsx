import { Card } from 'animal-island-ui'
import { formatCurrency } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import type { Transaction, Account } from '@/types'
import { ArrowDownIcon, ArrowUpIcon, InfoIcon } from '@/lib/components/icon-adapter'
import { iconClasses, animationClasses } from '@/lib/utils/design-classes'

interface RecentTransactionsProps {
  transactions: Transaction[]
  accounts: Account[]
  limit?: number
}

export function RecentTransactions({ transactions, accounts, limit = 5 }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <Card color="app-blue" className="group">
        <div className="p-6 pb-3">
          <h3 className="font-semibold text-lg text-white">最近交易</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-[#889df0]/50 flex items-center justify-center mb-4">
              <InfoIcon className="h-8 w-8 text-white" />
            </div>
            <p className="text-sm opacity-80">
              暂无交易记录
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const sortedTransactions = transactions
    .filter(txn => !(txn.tags?.includes('month-end') ?? false))
    .sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })
    .slice(0, limit)

  return (
    <Card color="app-blue" className={cn('group')}>
      <div className="p-6 pb-3">
        <h3 className="font-semibold text-lg text-white">最近交易</h3>
      </div>
      <div className="p-6 pt-0">
        <div className="space-y-3">
          {sortedTransactions.map((txn) => {
            const account = accounts.find(a => a.id === txn.accountId)
            const isIncome = txn.type === 'income'
            const isExpense = txn.type === 'expense'

            // 使用统一颜色变量
            const getIconBg = (type?: string) => {
              switch (type) {
                case 'income': return 'bg-[var(--color-profit)]'
                case 'expense': return 'bg-[var(--color-loss)]'
                default: return 'bg-[var(--animal-sidebar-active)]/50'
              }
            }

            return (
              <div
                key={txn.id}
                className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-all duration-200 cursor-pointer hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(iconClasses.container, iconClasses.hover, getIconBg(txn.type))}>
                    {isIncome ? (
                      <ArrowUpIcon className="h-5 w-5 text-white" />
                    ) : isExpense ? (
                      <ArrowDownIcon className="h-5 w-5 text-white" />
                    ) : (
                      <InfoIcon className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">{txn.description || account?.name || '未知账户'}</p>
                    <p className="text-xs opacity-80 mt-0.5">{account?.name || '未知账户'}</p>
                  </div>
                </div>
                <span className={cn(
                  "font-bold text-sm",
                  isIncome && "text-[var(--color-profit)]",
                  isExpense && "text-[var(--color-loss)]",
                  !isIncome && !isExpense && "opacity-80"
                )}>
                  {isIncome && '+'}
                  {isExpense && '-'}
                  {txn.amount ? formatCurrency(txn.amount) : '-'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
