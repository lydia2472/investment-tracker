'use client'
import { ReactNode, useEffect } from 'react'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { updateAllAccountsFromSnapshots } from '@/lib/utils/profit-calculator'
import { InterestSyncService } from '@/lib/services/interest-sync-service'

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 仅在客户端运行时初始化
    if (typeof window !== 'undefined') {
      console.log(`%c[StoreProvider] ========== 客户端初始化开始 ==========`, 'color: #ff0000; font-size: 16px; font-weight: bold;')

      // 在客户端初始化时更新账户余额
      const accountStore = useAccountStore.getState()
      const transactionStore = useTransactionStore.getState()

      console.log(`[StoreProvider] 账户数: ${accountStore.accounts.length}`)
      console.log(`[StoreProvider] 交易数: ${transactionStore.transactions.length}`)

      // 从最新月末快照更新所有账户余额
      const updates = updateAllAccountsFromSnapshots(
        transactionStore.transactions,
        accountStore.accounts
      )

      // 应用更新到 store
      updates.forEach((newBalance, accountId) => {
        accountStore.updateBalance(accountId, newBalance)
      })

      console.log(`[StoreProvider] 准备同步利息...`)

      // 同步所有定期存款账户的利息
      InterestSyncService.syncAllInterest()

      // 重新从所有交易（包括新生成的转账）更新账户余额
      const updatedTransactionStore = useTransactionStore.getState()
      const updatedAccountStore = useAccountStore.getState()

      console.log(`[StoreProvider] 重新计算余额...`)
      console.log(`[StoreProvider] 当前交易数: ${updatedTransactionStore.transactions.length}`)

      const balanceUpdates = updateAllAccountsFromSnapshots(
        updatedTransactionStore.transactions,
        updatedAccountStore.accounts
      )

      balanceUpdates.forEach((newBalance, accountId) => {
        console.log(`[StoreProvider] 更新账户 ${accountId} 余额: ${updatedAccountStore.getAccount(accountId)?.name} → ${newBalance}`)
        updatedAccountStore.updateBalance(accountId, newBalance)
      })

      console.log(`%c[StoreProvider] ========== 客户端初始化完成 ==========`, 'color: #ff0000; font-size: 16px; font-weight: bold;')
    }
  }, [])

  return <>{children}</>
}
