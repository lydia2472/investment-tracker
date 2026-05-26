import { useMemo } from 'react'
import type { Transaction } from '@/types'
import { TransactionType } from '@/types'

export interface TransactionTotals {
  totalIncome: number
  totalExpense: number
  netAmount: number
}

export function useTransactionTotals(transactions: Transaction[]): TransactionTotals {
  return useMemo(() => {
    // 筛选收入交易
    const incomeTransactions = transactions.filter(t =>
      t.type === TransactionType.INCOME ||
      t.type === TransactionType.DEPOSIT
    )

    // 筛选支出交易
    const expenseTransactions = transactions.filter(t =>
      t.type === TransactionType.CONSUMPTION ||
      t.type === TransactionType.TRANSFER_OUT ||
      t.type === TransactionType.LOAN
    )

    // 计算总计
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    const netAmount = totalIncome - totalExpense

    return { totalIncome, totalExpense, netAmount }
  }, [transactions])
}
