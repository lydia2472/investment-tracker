import { TransactionType } from '@/types'

/**
 * 获取交易类型标签
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
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
  return labels[type]
}

/**
 * 获取交易类型对应的 Badge 变体
 */
export function getTransactionTypeVariant(
  type: TransactionType
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (
    type === TransactionType.INCOME ||
    type === TransactionType.DEPOSIT ||
    type === TransactionType.TRANSFER_IN ||
    type === TransactionType.INVESTMENT_PROFIT
  )
    return 'default'
  if (
    type === TransactionType.CONSUMPTION ||
    type === TransactionType.TRANSFER_OUT ||
    type === TransactionType.LOAN ||
    type === TransactionType.INVESTMENT_LOSS
  )
    return 'destructive'
  if (type === TransactionType.TRANSFER) return 'outline'
  return 'secondary'
}

/**
 * 获取交易类型对应的颜色类名
 */
export function getTransactionTypeColor(type: TransactionType): string {
  if (
    type === TransactionType.INCOME ||
    type === TransactionType.DEPOSIT ||
    type === TransactionType.TRANSFER_IN ||
    type === TransactionType.INVESTMENT_PROFIT
  )
    return 'text-green-600'
  if (
    type === TransactionType.CONSUMPTION ||
    type === TransactionType.TRANSFER_OUT ||
    type === TransactionType.LOAN ||
    type === TransactionType.INVESTMENT_LOSS
  )
    return 'text-red-600'
  if (type === TransactionType.TRANSFER) return 'text-blue-600'
  return 'text-muted-foreground'
}

/**
 * 格式化交易金额（带符号和颜色）
 */
export function formatTransactionAmount(amount: number, type: TransactionType): string {
  const prefix =
    type === TransactionType.INCOME ||
    type === TransactionType.DEPOSIT ||
    type === TransactionType.TRANSFER_IN ||
    type === TransactionType.INVESTMENT_PROFIT
      ? '+'
      : type === TransactionType.CONSUMPTION ||
          type === TransactionType.TRANSFER_OUT ||
          type === TransactionType.LOAN ||
          type === TransactionType.INVESTMENT_LOSS
        ? '-'
        : type === TransactionType.TRANSFER
          ? '→'
          : ''
  return `${prefix}${amount.toFixed(2)}`
}

/**
 * 获取交易描述（如果没有描述，使用备用值）
 */
export function getTransactionDescription(
  description: string | undefined,
  fallback: string
): string {
  return description || fallback
}
