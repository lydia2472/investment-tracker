import { TransactionType } from '@/types'

/**
 * 获取交易类型标签
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    [TransactionType.INCOME]: '收入',
    [TransactionType.EXPENSE]: '支出',
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
  if (type === TransactionType.INCOME) return 'default'
  if (type === TransactionType.EXPENSE) return 'destructive'
  return 'secondary'
}

/**
 * 获取交易类型对应的颜色类名
 */
export function getTransactionTypeColor(type: TransactionType): string {
  if (type === TransactionType.INCOME) return 'text-green-600'
  if (type === TransactionType.EXPENSE) return 'text-red-600'
  return 'text-muted-foreground'
}

/**
 * 格式化交易金额（带符号和颜色）
 */
export function formatTransactionAmount(amount: number, type: TransactionType): string {
  const prefix = type === TransactionType.INCOME ? '+' : type === TransactionType.EXPENSE ? '-' : ''
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
