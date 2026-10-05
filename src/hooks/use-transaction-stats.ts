import { useMemo } from 'react'

import { useTransactionStore } from '@/lib/stores'
import { TransactionType } from '@/types'

import type { Transaction } from '@/types'

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
    const incomeCount = transactions.filter(
      (t) => t.type === TransactionType.INCOME || t.type === TransactionType.DEPOSIT
    ).length
    const expenseCount = transactions.filter(
      (t) => t.type === TransactionType.CONSUMPTION || t.type === TransactionType.LOAN
    ).length
    const transferCount = transactions.filter(
      (t) =>
        t.type === TransactionType.TRANSFER_IN ||
        t.type === TransactionType.TRANSFER_OUT ||
        t.type === TransactionType.TRANSFER
    ).length
    const snapshotCount = transactions.filter((t) => t.type === TransactionType.SNAPSHOT).length

    // 总收入和总支出只统计日常现金流
    const incomeTransactions = transactions.filter(
      (t) => t.type === TransactionType.INCOME || t.type === TransactionType.DEPOSIT
    )
    const expenseTransactions = transactions.filter(
      (t) => t.type === TransactionType.CONSUMPTION || t.type === TransactionType.LOAN
    )

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)

    // 平均收入和支出
    const averageIncome = incomeCount > 0 ? totalIncome / incomeCount : 0
    const averageExpense = expenseCount > 0 ? totalExpense / expenseCount : 0

    // 最近交易（前10条，按创建时间倒序）
    const recentTransactions = [...transactions]
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
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
