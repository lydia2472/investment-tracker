import { formatCurrency } from '@/lib/utils/formatters'
import { TransactionType } from '@/types'

interface TransactionAmountProps {
  amount: number
  type: TransactionType
}

export function TransactionAmount({ amount, type }: TransactionAmountProps) {
  const isIncomes = type === TransactionType.INCOME
  const isExpense = type === TransactionType.EXPENSE

  return (
    <span className={`font-medium ${
      isIncomes
        ? 'text-green-600'
        : isExpense
        ? 'text-red-600'
        : ''
    }`}>
      {isIncomes && '+'}
      {isExpense && '-'}
      {amount ? formatCurrency(amount) : '-'}
    </span>
  )
}
