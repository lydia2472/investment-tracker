import { useMemo } from 'react'
import { useTransactionStore } from '@/lib/stores'
import type { Transaction } from '@/types'
import { TransactionType } from '@/types'

export interface TransactionStats {
  totalCount: number
  incomeCount: number
  expenseCount: number
  transferCount: number
  snapshotCount: number
  totalIncome: number
  totalExpense: number
  averageIncome: number
  averageExpense: number
  recentTransactions: Transaction[]
  incomeTransactions: Transaction[]
  expenseTransactions: Transaction[]
}

export function useTransactionStats(): TransactionStats {
  const transactions = useTransactionStore((state) => state.transactions)

  return useMemo(() => {
    // 交易总数
    const totalCount = transactions.length

    // 按类型统计数量
    const incomeCount = transactions.filter(t => t.type === TransactionType.INCOME).length
    const expenseCount = transactions.filter(t => t.type === TransactionType.EXPENSE).length
    const transferCount = transactions.filter(t => t.type === TransactionType.TRANSFER).length
    const snapshotCount = transactions.filter(t => t.type === TransactionType.SNAPSHOT).length

    // 总收入和总支出
    const incomeTransactions = transactions.filter(t => t.type === TransactionType.INCOME)
    const expenseTransactions = transactions.filter(t => t.type === TransactionType.EXPENSE)

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)

    // 平均收入和支出
    const averageIncome = incomeCount > 0 ? totalIncome / incomeCount : 0
    const averageExpense = expenseCount > 0 ? totalExpense / expenseCount : 0

    // 最近交易（前10条，按创建时间倒序）
    const recentTransactions = [...transactions]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)

    return {
      totalCount,
      incomeCount,
      expenseCount,
      transferCount,
      snapshotCount,
      totalIncome,
      totalExpense,
      averageIncome,
      averageExpense,
      recentTransactions,
      incomeTransactions,
      expenseTransactions,
    }
  }, [transactions])
}
