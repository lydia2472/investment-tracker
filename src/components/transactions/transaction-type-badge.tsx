import { Badge } from '@/components/ui/badge'
import { TransactionType } from '@/types'

const transactionTypeLabels: Record<TransactionType, string> = {
  [TransactionType.INCOME]: '收入',
  [TransactionType.DEPOSIT]: '存款',
  [TransactionType.TRANSFER_IN]: '转入',
  [TransactionType.INVESTMENT_PROFIT]: '投资收益',
  [TransactionType.CONSUMPTION]: '消费',
  [TransactionType.TRANSFER_OUT]: '转出',
  [TransactionType.LOAN]: '放贷',
  [TransactionType.INVESTMENT_LOSS]: '投资亏损',
  [TransactionType.TRANSFER]: '转账',
  [TransactionType.SNAPSHOT]: '快照',
}

const getTransactionTypeVariant = (
  type: TransactionType
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (
    type === TransactionType.INCOME ||
    type === TransactionType.DEPOSIT ||
    type === TransactionType.TRANSFER_IN ||
    type === TransactionType.INVESTMENT_PROFIT ||
    type === TransactionType.INVESTMENT_LOSS
  )
    return 'default'
  if (
    type === TransactionType.CONSUMPTION ||
    type === TransactionType.TRANSFER_OUT ||
    type === TransactionType.LOAN
  )
    return 'destructive'
  if (type === TransactionType.TRANSFER) return 'outline'
  return 'secondary'
}

interface TransactionTypeBadgeProps {
  type: TransactionType
}

export function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  return <Badge variant={getTransactionTypeVariant(type)}>{transactionTypeLabels[type]}</Badge>
}
