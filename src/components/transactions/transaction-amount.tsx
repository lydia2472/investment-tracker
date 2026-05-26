import { formatCurrency } from '@/lib/utils/formatters'
import { TransactionType } from '@/types'

interface TransactionAmountProps {
  amount?: number
  balance?: number
  type: TransactionType
}

export function TransactionAmount({ amount, balance, type }: TransactionAmountProps) {
  const isIncomes = type === TransactionType.INCOME ||
                    type === TransactionType.DEPOSIT ||
                    type === TransactionType.TRANSFER_IN
  const isExpense = type === TransactionType.CONSUMPTION ||
                   type === TransactionType.TRANSFER_OUT ||
                   type === TransactionType.LOAN
  const isTransfer = type === TransactionType.TRANSFER
  const isSnapshot = type === TransactionType.SNAPSHOT

  // 快照显示balance，其他类型显示amount
  const displayValue = isSnapshot ? balance : amount

  return (
    <span
      className={`font-medium ${
        isIncomes
          ? 'text-green-600'
          : isExpense
          ? 'text-red-600'
          : isTransfer
          ? 'text-blue-600'
          : ''
      }`}
      style={!isIncomes && !isExpense && !isTransfer ? { color: '#794f27' } : undefined}
    >
      {isIncomes && '+'}
      {isExpense && '-'}
      {isTransfer && '→'}
      {displayValue !== undefined && displayValue !== null ? formatCurrency(displayValue) : '-'}
    </span>
  )
}
