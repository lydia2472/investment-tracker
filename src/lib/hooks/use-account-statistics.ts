'use client'
import { useTransactionStore } from '@/lib/stores'
import { TransactionType, TransactionCategory, AccountStatistics } from '@/types'
import { useMemo } from 'react'

export function useAccountStatistics(): AccountStatistics {
  const transactions = useTransactionStore((state) => state.transactions)

  return useMemo(() => {
    const stats: AccountStatistics = {
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      transactionCount: transactions.length,
      depositCount: 0,
      withdrawCount: 0,
      investmentGain: 0,
      investmentLoss: 0,
    }

    transactions.forEach((txn) => {
      if (txn.type === TransactionType.INCOME && txn.amount) {
        stats.totalIncome += txn.amount
        if (txn.category === TransactionCategory.DEPOSIT) {
          stats.depositCount++
        }
        if (txn.category === TransactionCategory.INVESTMENT_GAIN) {
          stats.investmentGain += txn.amount
        }
      }

      if (txn.type === TransactionType.EXPENSE && txn.amount) {
        stats.totalExpense += txn.amount
        if (txn.category === TransactionCategory.WITHDRAW) {
          stats.withdrawCount++
        }
        if (txn.category === TransactionCategory.INVESTMENT_LOSS) {
          stats.investmentLoss += txn.amount
        }
      }
    })

    stats.netIncome = stats.totalIncome - stats.totalExpense

    if (transactions.length > 0) {
      const sortedTxns = [...transactions].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )
      stats.lastTransactionDate = sortedTxns[0].createdAt
    }

    return stats
  }, [transactions])
}
