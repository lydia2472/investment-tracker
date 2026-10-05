'use client'
import { useMemo } from 'react'

import { useTransactionStore } from '@/lib/stores'
import { TransactionType, AccountStatistics } from '@/types'

export function useAccountStatistics(): AccountStatistics {
  const transactions = useTransactionStore((state) => state.transactions)

  return useMemo(() => {
    const stats: AccountStatistics = {
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      transactionCount: transactions.length,
      depositCount: 0,
      consumptionCount: 0,
    }

    transactions.forEach((txn) => {
      // 收入类型：只统计日常现金流
      if (txn.type === TransactionType.INCOME && txn.amount) {
        stats.totalIncome += txn.amount
      }

      if (txn.type === TransactionType.DEPOSIT && txn.amount) {
        stats.totalIncome += txn.amount
        stats.depositCount++
      }

      // 支出类型：只统计日常现金流
      if (txn.type === TransactionType.CONSUMPTION && txn.amount) {
        stats.totalExpense += txn.amount
        stats.consumptionCount++
      }

      if (txn.type === TransactionType.LOAN && txn.amount) {
        stats.totalExpense += txn.amount
      }
    })

    stats.netIncome = stats.totalIncome - stats.totalExpense

    if (transactions.length > 0) {
      const sortedTxns = [...transactions].sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
      const lastCreated = sortedTxns[0].createdAt
      stats.lastTransactionDate = lastCreated instanceof Date ? lastCreated : new Date(lastCreated)
    }

    return stats
  }, [transactions])
}
