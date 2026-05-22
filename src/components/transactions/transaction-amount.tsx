import { formatCurrency } from '@/lib/utils/formatters'
import { TransactionType } from '@/types'

interface TransactionAmountProps {
  amount?: number
  balance?: number
  type: TransactionType
}

export function TransactionAmount({ amount, balance, type }: TransactionAmountProps) {
  const isIncomes = type === TransactionType.INCOME
  const isExpense = type === TransactionType.EXPENSE
  const isSnapshot = type === TransactionType.SNAPSHOT

  // 快照显示balance，其他类型显示amount
  const displayValue = isSnapshot ? balance : amount

  return (
    <span className={`font-medium ${
      isIncomes
        ? 'text-green-600'
        : isExpense
        ? 'text-red-600'
        : 'text-muted-foreground'  // 快照和转账使用灰色
    }`}>
      {isIncomes && '+'}
      {isExpense && '-'}
      {displayValue !== undefined && displayValue !== null ? formatCurrency(displayValue) : '-'}
    </span>
  )
}
