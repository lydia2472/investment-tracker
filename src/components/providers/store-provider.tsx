'use client'
import { ReactNode, useEffect } from 'react'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { updateAllAccountsFromSnapshots } from '@/lib/utils/profit-calculator'
import { InterestSyncService } from '@/lib/services/interest-sync-service'

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 仅在客户端运行时初始化
    if (typeof window !== 'undefined') {
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

      // 同步所有定期存款账户的利息
      InterestSyncService.syncAllInterest()
    }
  }, [])

  return <>{children}</>
}
