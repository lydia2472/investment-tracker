import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import type { Transaction, Account } from '@/types'
import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react'

interface RecentTransactionsProps {
  transactions: Transaction[]
  accounts: Account[]
  limit?: number
}

export function RecentTransactions({ transactions, accounts, limit = 5 }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>最近交易</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              暂无交易记录
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const sortedTransactions = transactions
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle>最近交易</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedTransactions.map((txn) => {
            const account = accounts.find(a => a.id === txn.accountId)
            const isIncome = txn.type === 'income'
            const isExpense = txn.type === 'expense'

            return (
              <div
                key={txn.id}
                className="group flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all duration-200 cursor-pointer hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
                    isIncome && "bg-gradient-to-br from-emerald-500 to-green-500 shadow-emerald-500/30",
                    isExpense && "bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/30",
                    !isIncome && !isExpense && "bg-gradient-to-br from-muted to-muted-50"
                  )}>
                    {isIncome ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : isExpense ? (
                      <ArrowDownLeft className="h-5 w-5" />
                    ) : (
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{txn.description || account?.name || '未知账户'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{account?.name || '未知账户'}</p>
                  </div>
                </div>
                <span className={cn(
                  "font-bold text-sm",
                  isIncome && "bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent",
                  isExpense && "bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent",
                  !isIncome && !isExpense && "text-muted-foreground"
                )}>
                  {isIncome && '+'}
                  {isExpense && '-'}
                  {txn.amount ? formatCurrency(txn.amount) : '-'}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
