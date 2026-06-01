import { formatCurrency } from '@/lib/utils/formatters'
import { TransactionType } from '@/types'

interface TransactionAmountProps {
  amount?: number
  balance?: number
  type: TransactionType
}

export function TransactionAmount({ amount, balance, type }: TransactionAmountProps) {
  const isIncomes =
    type === TransactionType.INCOME ||
    type === TransactionType.DEPOSIT ||
    type === TransactionType.TRANSFER_IN ||
    type === TransactionType.INVESTMENT_PROFIT
  const isExpense =
    type === TransactionType.CONSUMPTION ||
    type === TransactionType.TRANSFER_OUT ||
    type === TransactionType.LOAN ||
    type === TransactionType.INVESTMENT_LOSS
  const isTransfer = type === TransactionType.TRANSFER
  const isSnapshot = type === TransactionType.SNAPSHOT

  // 快照显示balance，其他类型显示amount
  const displayValue = isSnapshot ? balance : amount

  // 对于投资亏损，金额已经是负数，显示时取绝对值并加负号
  const formattedValue =
    type === TransactionType.INVESTMENT_LOSS && displayValue !== undefined && displayValue !== null
      ? Math.abs(displayValue)
      : displayValue

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
      {formattedValue !== undefined && formattedValue !== null ? formatCurrency(formattedValue) : '-'}
    </span>
  )
}
