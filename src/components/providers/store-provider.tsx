'use client'
import { ReactNode, useEffect } from 'react'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { updateAllAccountsFromSnapshots } from '@/lib/utils/profit-calculator'

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 在客户端初始化时更新账户余额
    const accountStore = useAccountStore.getState()
    const transactionStore = useTransactionStore.getState()

    // 从最新月末快照更新所有账户余额
    const updates = updateAllAccountsFromSnapshots(
      transactionStore.transactions,
      accountStore.accounts
    )

    // 应用更新到 store
    updates.forEach((newBalance, accountId) => {
      accountStore.updateBalance(accountId, newBalance)
    })
  }, [])

  return <>{children}</>
}
