import { Badge } from '@/components/ui/badge'
import { TransactionType } from '@/types'

const transactionTypeLabels: Record<TransactionType, string> = {
  [TransactionType.INCOME]: '收入',
  [TransactionType.EXPENSE]: '支出',
  [TransactionType.TRANSFER]: '转账',
  [TransactionType.SNAPSHOT]: '快照',
}

const getTransactionTypeVariant = (type: TransactionType): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (type === TransactionType.INCOME) return 'default'
  if (type === TransactionType.EXPENSE) return 'destructive'
  return 'secondary'
}

interface TransactionTypeBadgeProps {
  type: TransactionType
}

export function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  return (
    <Badge variant={getTransactionTypeVariant(type)}>
      {transactionTypeLabels[type]}
    </Badge>
  )
}
