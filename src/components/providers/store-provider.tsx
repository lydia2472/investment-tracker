'use client'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { InterestSyncService } from '@/lib/services/interest-sync-service'
import { MaturityReminderService } from '@/lib/services/maturity-reminder-service'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import { debugLog } from '@/lib/utils/debug-log'
import { formatCurrency } from '@/lib/utils/formatters'
import { updateAllAccountsFromSnapshots } from '@/lib/utils/profit-calculator'
import { createSnapshotProfitSyncPlan } from '@/lib/utils/snapshot-profit-sync'

import type { Snapshot } from '@/lib/stores/snapshot-store'

export function StoreProvider({ children }: { children: ReactNode }) {
  const startupScheduledRef = useRef(false)
  const [startupReady, setStartupReady] = useState(false)
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)
  const snapshots = useSnapshotStore((state) => state.snapshots)

  useEffect(() => {
    if (typeof window === 'undefined' || startupScheduledRef.current) {
      return
    }

    startupScheduledRef.current = true
    const timer = window.setTimeout(() => {
      debugLog('[StoreProvider] 客户端初始化开始')

      try {
      // 🔴 自动清理重复记录
        const transactionStore = useTransactionStore.getState()
        const snapshotStore = useSnapshotStore.getState()

        const transactions = transactionStore.transactions
        const snapshots = snapshotStore.snapshots

        // 查找重复的交易
        // 去重 key 必须能区分同一天的多笔不同转账/交易：
        //   转账类需加 amount + 目标/来源账户 + pairId；
        //   普通交易需加 amount + 描述。
        const transactionMap = new Map<string, string>()
        const duplicateTransactionIds: string[] = []

        transactions.forEach((txn) => {
          const date = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

          // 转账类：用 amount + 对方账户 + pairId 区分（避免同一天多笔转账被误判为重复）
          const isTransfer =
            txn.type === 'transfer_in' ||
            txn.type === 'transfer_out' ||
            txn.type === 'transfer'

          const transferPart = isTransfer
            ? `:${txn.amount || 0}:${txn.transferToAccountId || ''}:${txn.transferFromAccountId || ''}:${txn.transferPairId || ''}`
            : `:${txn.amount || 0}:${txn.description || ''}`

          const key = `${txn.accountId}:${dateKey}:${txn.type}${transferPart}`

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
          const date =
            snap.snapshotDate instanceof Date ? snap.snapshotDate : new Date(snap.snapshotDate)
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          const key = `${snap.accountId}:${dateKey}`

          if (snapshotMap.has(key)) {
            duplicateSnapshotIds.push(snap.id)
          } else {
            snapshotMap.set(key, snap.id)
          }
        })

        // 自动删除重复记录（最后一道防线：绝不把成对转账删成孤儿）
        if (duplicateTransactionIds.length > 0 || duplicateSnapshotIds.length > 0) {
          debugLog('[StoreProvider] 发现重复记录', {
            duplicateTransactions: duplicateTransactionIds.length,
            duplicateSnapshots: duplicateSnapshotIds.length,
          })

          if (duplicateTransactionIds.length > 0) {
            // 过滤：保留转账类交易，避免删除后产生孤儿配对。
            // 去重只应作用于快照收益同步类交易，转账的真实性由用户保证。
            const safeToDelete = duplicateTransactionIds.filter((id) => {
              const txn = transactions.find((t) => t.id === id)
              if (!txn) return false
              const isTransfer =
                txn.type === 'transfer_in' || txn.type === 'transfer_out' || txn.type === 'transfer'
              return !isTransfer
            })
            if (safeToDelete.length > 0) {
              debugLog('[StoreProvider] 实际删除重复交易', { count: safeToDelete.length })
              transactionStore.deleteMultiple(safeToDelete)
            }
          }

          if (duplicateSnapshotIds.length > 0) {
            duplicateSnapshotIds.forEach((id) => {
              snapshotStore.deleteSnapshot(id)
            })
          }

          toast.success('已自动清理重复记录', {
            description: `删除了 ${duplicateTransactionIds.length} 条重复交易和 ${duplicateSnapshotIds.length} 条重复快照`,
          })
        }

        const accountStore = useAccountStore.getState()
        const latestTransactionStore = useTransactionStore.getState()
        const latestSnapshotStore = useSnapshotStore.getState()

        // 从最新月末快照更新所有账户余额（独立保护：失败不影响后续利息同步）
        try {
          const balanceUpdates = updateAllAccountsFromSnapshots(
            latestTransactionStore.transactions,
            accountStore.accounts,
            latestSnapshotStore.snapshots
          )
          accountStore.updateBalances(balanceUpdates)
        } catch (err) {
          console.error('[StoreProvider] ✗ 余额更新失败（跳过，继续后续初始化）:', err)
        }

        // 同步所有定期存款账户的利息（独立保护）
        try {
          const synced = InterestSyncService.syncAllInterest()
          console.log('[StoreProvider] 利息同步完成:', synced ? '有变更' : '无需变更')
        } catch (err) {
          console.error('[StoreProvider] ✗ 利息同步失败:', err)
        }

        // 检查是否有已到期但未转账的定期存款
        const maturedDeposits = MaturityReminderService.getMaturedDeposits()

        if (maturedDeposits.length > 0) {
          debugLog('[StoreProvider] 发现已到期定期存款', maturedDeposits.length)

          toast.success('定期存款到期提醒', {
            description: `您有 ${maturedDeposits.length} 个定期存款已到期待处理`,
            action: {
              label: '查看详情',
              onClick: () => {
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
        }
      } finally {
        debugLog('[StoreProvider] 客户端初始化完成')
        setStartupReady(true)
      }
    }, 32)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !startupReady) {
      return
    }

    // 调试入口：控制台可手动触发利息同步（验证定期存款利息补生成）
    if (typeof window !== undefined && !(window as any).__interestSync) {
      ;(window as any).__interestSync = () => {
        try {
          const ok = InterestSyncService.syncAllInterest()
          console.log('[手动利息同步] 完成:', ok ? '有变更' : '无需变更')
          return ok
        } catch (err) {
          console.error('[手动利息同步] 失败:', err)
          return false
        }
      }
    }

    const transactionStore = useTransactionStore.getState()
    const syncPlan = createSnapshotProfitSyncPlan(accounts, snapshots, transactions)

    if (
      syncPlan.create.length === 0 &&
      syncPlan.update.length === 0 &&
      syncPlan.deleteIds.length === 0
    ) {
      return
    }

    debugLog('[StoreProvider] 同步快照收益交易', {
      create: syncPlan.create.length,
      update: syncPlan.update.length,
      delete: syncPlan.deleteIds.length,
    })

    transactionStore.applyBulkChanges(syncPlan)
  }, [accounts, snapshots, startupReady, transactions])

  return <>{children}</>
}
