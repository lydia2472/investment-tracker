'use client'
import { ReactNode, useEffect } from 'react'
import { toast } from 'sonner'

import { InterestSyncService } from '@/lib/services/interest-sync-service'
import { MaturityReminderService } from '@/lib/services/maturity-reminder-service'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import { formatCurrency } from '@/lib/utils/formatters'
import { updateAllAccountsFromSnapshots } from '@/lib/utils/profit-calculator'
import type { Snapshot } from '@/lib/stores/snapshot-store'

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 仅在客户端运行时初始化
    if (typeof window !== 'undefined') {
      console.log(
        `%c[StoreProvider] ========== 客户端初始化开始 ==========`,
        'color: #ff0000; font-size: 16px; font-weight: bold;'
      )

      // 🔴 自动清理重复记录
      const transactionStore = useTransactionStore.getState()
      const snapshotStore = useSnapshotStore.getState()

      const transactions = transactionStore.transactions
      const snapshots = snapshotStore.snapshots

      // 查找重复的交易
      const transactionMap = new Map<string, string>()
      const duplicateTransactionIds: string[] = []

      transactions.forEach((txn) => {
        const date = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        const key = `${txn.accountId}:${dateKey}:${txn.type}`

        if (transactionMap.has(key)) {
          duplicateTransactionIds.push(txn.id)
        } else {
          transactionMap.set(key, txn.id)
        }
      })

      // 查找重复的快照
      const snapshotMap = new Map<string, string>()
      const duplicateSnapshotIds: string[] = []

      snapshots.forEach((snap: Snapshot) => {
        const date = snap.snapshotDate instanceof Date ? snap.snapshotDate : new Date(snap.snapshotDate)
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        const key = `${snap.accountId}:${dateKey}`

        if (snapshotMap.has(key)) {
          duplicateSnapshotIds.push(snap.id)
        } else {
          snapshotMap.set(key, snap.id)
        }
      })

      // 自动删除重复记录
      let deletedCount = 0
      if (duplicateTransactionIds.length > 0 || duplicateSnapshotIds.length > 0) {
        console.log(
          `%c[StoreProvider] 🔍 发现重复记录 - 交易: ${duplicateTransactionIds.length}, 快照: ${duplicateSnapshotIds.length}`,
          'color: #ff6600; font-weight: bold;'
        )

        // 删除重复的交易
        if (duplicateTransactionIds.length > 0) {
          transactionStore.deleteMultiple(duplicateTransactionIds)
          deletedCount += duplicateTransactionIds.length
          console.log(`[StoreProvider] ✓ 已删除 ${duplicateTransactionIds.length} 条重复交易`)
        }

        // 删除重复的快照
        if (duplicateSnapshotIds.length > 0) {
          duplicateSnapshotIds.forEach((id) => {
            snapshotStore.deleteSnapshot(id)
          })
          deletedCount += duplicateSnapshotIds.length
          console.log(`[StoreProvider] ✓ 已删除 ${duplicateSnapshotIds.length} 条重复快照`)
        }

        // 显示提示
        toast.success('已自动清理重复记录', {
          description: `删除了 ${duplicateTransactionIds.length} 条重复交易和 ${duplicateSnapshotIds.length} 条重复快照`,
        })
      }

      // 获取账户和交易数据（清理后）
      const accountStore = useAccountStore.getState()

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
        console.log(
          `[StoreProvider] 更新账户 ${accountId} 余额: ${updatedAccountStore.getAccount(accountId)?.name} → ${newBalance}`
        )
        updatedAccountStore.updateBalance(accountId, newBalance)
      })

      console.log(`[StoreProvider] 检查到期提醒...`)

      // 检查是否有已到期但未转账的定期存款
      const maturedDeposits = MaturityReminderService.getMaturedDeposits()

      if (maturedDeposits.length > 0) {
        console.log(`[StoreProvider] 发现 ${maturedDeposits.length} 个已到期定期存款`)

        // 显示到期提醒
        toast.success('定期存款到期提醒', {
          description: `您有 ${maturedDeposits.length} 个定期存款已到期待处理`,
          action: {
            label: '查看详情',
            onClick: () => {
              // 显示详细列表
              const details = maturedDeposits
                .map(
                  (deposit) =>
                    `• ${deposit.account.name}: ${formatCurrency(deposit.totalAmount)} (${deposit.maturityDate.toLocaleDateString('zh-CN')}到期)`
                )
                .join('\n')

              toast.info('到期存款详情', {
                description: details,
                duration: 10000,
              })
            },
          },
          duration: 8000,
        })

        // 在控制台也打印详细信息
        console.log(`[到期提醒] 已到期定期存款列表:`)
        maturedDeposits.forEach((deposit) => {
          console.log(`  • ${deposit.account.name}:`)
          console.log(`    - 本金: ${deposit.principal}元`)
          console.log(`    - 利息: ${deposit.interest.toFixed(2)}元`)
          console.log(`    - 总额: ${deposit.totalAmount.toFixed(2)}元`)
          console.log(`    - 到期日: ${deposit.maturityDate.toLocaleDateString('zh-CN')}`)
        })
      } else {
        console.log(`[StoreProvider] 没有待处理的到期定期存款`)
      }

      console.log(
        `%c[StoreProvider] ========== 客户端初始化完成 ==========`,
        'color: #ff0000; font-size: 16px; font-weight: bold;'
      )
    }
  }, [])

  return <>{children}</>
}
