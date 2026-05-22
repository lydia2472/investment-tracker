import { useMemo } from 'react'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import type { AccountType } from '@/types'
import { TransactionType } from '@/types'

export interface AccountStats {
  totalAssets: number
  accountCount: number
  accountsByType: Record<AccountType, number>
  totalIncome: number
  totalExpense: number
  netIncome: number
  transactionCount: number
}

export function useAccountStats(): AccountStats {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)

  return useMemo(() => {
    // 计算总资产
    const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0)

    // 账户数量
    const accountCount = accounts.length

    // 按类型分组账户
    const accountsByType = accounts.reduce((acc, account) => {
      acc[account.type] = (acc[account.type] || 0) + 1
      return acc
    }, {} as Record<AccountType, number>)

    // 计算总收入
    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    // 计算总支出
    const totalExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    // 净收入
    const netIncome = totalIncome - totalExpense

    // 交易总数
    const transactionCount = transactions.length

    return {
      totalAssets,
      accountCount,
      accountsByType,
      totalIncome,
      totalExpense,
      netIncome,
      transactionCount,
    }
  }, [accounts, transactions])
}
