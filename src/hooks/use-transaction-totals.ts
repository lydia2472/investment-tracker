import { useMemo } from 'react'

import { TransactionType } from '@/types'

import type { Transaction } from '@/types'

export interface TransactionTotals {
  totalIncome: number
  totalExpense: number
  netAmount: number
  totalAmount: number // 所有交易金额的绝对值总和
}

export function useTransactionTotals(transactions: Transaction[]): TransactionTotals {
  return useMemo(() => {
    // 筛选收入交易
    const incomeTransactions = transactions.filter(
      (t) => t.type === TransactionType.INCOME || t.type === TransactionType.DEPOSIT || t.type === TransactionType.INVESTMENT_PROFIT
    )

    // 筛选支出交易
    const expenseTransactions = transactions.filter(
      (t) =>
        t.type === TransactionType.CONSUMPTION ||
        t.type === TransactionType.TRANSFER_OUT ||
        t.type === TransactionType.LOAN ||
        t.type === TransactionType.INVESTMENT_LOSS
    )

    // 计算总计
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    const netAmount = totalIncome - totalExpense

    // 计算金额总和（不包括转账和快照）
    const nonTransferTransactions = transactions.filter(
      (t) => t.type !== TransactionType.TRANSFER && t.type !== TransactionType.SNAPSHOT
    )
    const totalAmount = nonTransferTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)

    return { totalIncome, totalExpense, netAmount, totalAmount }
  }, [transactions])
}
