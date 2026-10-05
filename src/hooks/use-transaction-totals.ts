import { useMemo } from 'react'

import { TransactionType } from '@/types'

import type { Transaction } from '@/types'

export interface TransactionTotals {
  totalIncome: number
  totalExpense: number
  netAmount: number
  totalAmount: number // 投资收益/亏损净额 + 定期存款利息
}

export function computeTransactionTotals(transactions: Transaction[]): TransactionTotals {
  // 收支统计：收入=收入/存款/转入；支出=消费/放贷/转出。
  // 投资收益/亏损和利息归入"投资收益"指标，不计入收支。
  const incomeTransactions = transactions.filter(
    (t) =>
      t.type === TransactionType.INCOME ||
      t.type === TransactionType.DEPOSIT ||
      t.type === TransactionType.TRANSFER_IN
  )

  const expenseTransactions = transactions.filter(
    (t) =>
      t.type === TransactionType.CONSUMPTION ||
      t.type === TransactionType.LOAN ||
      t.type === TransactionType.TRANSFER_OUT
  )

  // 计算总计
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
  const netAmount = totalIncome - totalExpense

  // 投资收益 = 投资收益 − 投资亏损 + 定期存款利息（带"利息"标签的 INCOME）。
  // 与总览"各货币收益"口径一致（利息属于存款的投资回报）。
  // 转入/转出代表本金流动，不计入；日常收支已在"净额"指标中体现。
  const totalAmount = transactions.reduce((sum, transaction) => {
    if (transaction.type === TransactionType.INVESTMENT_PROFIT) {
      return sum + Math.abs(transaction.amount || 0)
    }
    if (transaction.type === TransactionType.INVESTMENT_LOSS) {
      return sum - Math.abs(transaction.amount || 0)
    }
    if (
      transaction.type === TransactionType.INCOME &&
      transaction.tags?.includes('利息')
    ) {
      return sum + Math.abs(transaction.amount || 0)
    }
    return sum
  }, 0)

  return { totalIncome, totalExpense, netAmount, totalAmount }
}

export function useTransactionTotals(transactions: Transaction[]): TransactionTotals {
  return useMemo(() => computeTransactionTotals(transactions), [transactions])
}
