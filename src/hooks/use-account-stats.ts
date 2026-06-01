import { useMemo } from 'react'

import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { TransactionType } from '@/types'

import type { AccountType } from '@/types'

export interface AccountStats {
  totalAssets: number
  accountCount: number
  accountsByType: Record<AccountType, number>
  totalIncome: number
  totalExpense: number
  netIncome: number
  transactionCount: number
}

export interface UseAccountStatsOptions {
  startDate?: Date // undefined = 全部数据
  endDate?: Date // undefined = 当前时间
}

export function useAccountStats(options?: UseAccountStatsOptions): AccountStats {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)

  return useMemo(() => {
    // 按日期范围筛选交易记录
    const filteredTransactions = (() => {
      if (!options?.startDate && !options?.endDate) {
        return transactions
      }
      return transactions.filter((t) => {
        const txnDate = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)
        if (options.startDate && txnDate < options.startDate) return false
        if (options.endDate && txnDate > options.endDate) return false
        return true
      })
    })()

    // 计算总资产（始终使用当前余额，不受日期筛选影响）
    const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0)

    // 账户数量
    const accountCount = accounts.length

    // 按类型分组账户
    const accountsByType = accounts.reduce(
      (acc, account) => {
        acc[account.type] = (acc[account.type] || 0) + 1
        return acc
      },
      {} as Record<AccountType, number>
    )

    // 计算总收入（INCOME, DEPOSIT, TRANSFER_IN 类型）
    const totalIncome = filteredTransactions
      .filter(
        (t) =>
          t.type === TransactionType.INCOME ||
          t.type === TransactionType.DEPOSIT ||
          t.type === TransactionType.TRANSFER_IN
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    // 计算总支出（CONSUMPTION, TRANSFER_OUT 类型）
    const totalExpense = filteredTransactions
      .filter(
        (t) => t.type === TransactionType.CONSUMPTION || t.type === TransactionType.TRANSFER_OUT
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    // 净收入（根据日期筛选）
    const netIncome = totalIncome - totalExpense

    // 交易总数（根据日期筛选）
    const transactionCount = filteredTransactions.length

    return {
      totalAssets,
      accountCount,
      accountsByType,
      totalIncome,
      totalExpense,
      netIncome,
      transactionCount,
    }
  }, [accounts, transactions, options])
}
