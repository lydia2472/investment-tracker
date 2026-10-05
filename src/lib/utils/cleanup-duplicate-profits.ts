import { TransactionType } from '@/types'
import type { Transaction } from '@/types'

/**
 * 查找重复的投资收益/亏损交易
 * @param transactions - 所有交易
 * @returns 重复交易的分组
 */
export function findDuplicateProfitTransactions(transactions: Transaction[]) {
  // 筛选投资收益和亏损交易
  const profitTxns = transactions.filter((txn) =>
    txn.type === TransactionType.INVESTMENT_PROFIT ||
    txn.type === TransactionType.INVESTMENT_LOSS
  )

  // 按账户、月份、类型分组
  const groups = new Map<string, Transaction[]>()

  profitTxns.forEach((txn) => {
    if (!txn.createdAt) return

    const date = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    // 分组键：accountId-year-month-type
    const key = `${txn.accountId}-${year}-${month}-${txn.type}`

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(txn)
  })

  // 找出有重复的组
  const duplicates = new Map<string, Transaction[]>()

  groups.forEach((txns, key) => {
    if (txns.length > 1) {
      duplicates.set(key, txns)
    }
  })

  return duplicates
}

/**
 * 清理重复的交易，保留最早的交易
 * @param transactions - 所有交易
 * @returns 需要删除的交易ID列表
 */
export function getDuplicateProfitIdsToDelete(transactions: Transaction[]): string[] {
  const duplicates = findDuplicateProfitTransactions(transactions)
  const idsToDelete: string[] = []

  duplicates.forEach((txns) => {
    // 按创建时间排序，最早的在前面
    const sorted = [...txns].sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateA.getTime() - dateB.getTime()
    })

    // 保留第一个（最早的），删除其余的
    const toDelete = sorted.slice(1)
    toDelete.forEach((txn) => idsToDelete.push(txn.id))
  })

  return idsToDelete
}
