import { useMemo } from 'react'

import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { TransactionType } from '@/types'

export interface TagAsset {
  tag: string
  amount: number
  percentage: number
  color: string
}

export interface TagAssetsByCurrency {
  currency: string
  tagAssets: TagAsset[]
  totalAssets: number
}

export interface UseTagAssetsOptions {
  tagFilter?: string[] // 可选的标签筛选
}

// 默认颜色列表
const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
]

/**
 * 计算标签资产统计的 Hook
 * @param options 可选配置，包含标签筛选
 * @returns 按币种分组的标签资产数据
 */
export function useTagAssets(options?: UseTagAssetsOptions): TagAssetsByCurrency[] {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)

  return useMemo(() => {
    // 1. 获取所有快照交易（用于资产统计）
    const snapshots = transactions.filter(
      (t) => t.type === TransactionType.SNAPSHOT && t.tags && t.tags.length > 0
    )

    // 2. 为每个账户找到最新的快照
    const accountLatestSnapshot = new Map<string, (typeof snapshots)[0]>()
    snapshots.forEach((snapshot) => {
      const existing = accountLatestSnapshot.get(snapshot.accountId)
      if (!existing) {
        accountLatestSnapshot.set(snapshot.accountId, snapshot)
      } else {
        const existingDate =
          existing.createdAt instanceof Date ? existing.createdAt : new Date(existing.createdAt)
        const snapshotDate =
          snapshot.createdAt instanceof Date ? snapshot.createdAt : new Date(snapshot.createdAt)
        if (snapshotDate > existingDate) {
          accountLatestSnapshot.set(snapshot.accountId, snapshot)
        }
      }
    })

    // 3. 按币种分组账户
    const accountsByCurrency = new Map<string, typeof accounts>()
    accounts.forEach((account) => {
      if (!accountsByCurrency.has(account.currency)) {
        accountsByCurrency.set(account.currency, [])
      }
      accountsByCurrency.get(account.currency)!.push(account)
    })

    // 4. 为每个币种计算标签资产
    const result: TagAssetsByCurrency[] = []

    accountsByCurrency.forEach((currencyAccounts, currency) => {
      // 按标签分组资产
      const tagAmountMap = new Map<string, number>()
      let totalAssets = 0

      currencyAccounts.forEach((account) => {
        // 查找该账户的最新快照
        const snapshot = accountLatestSnapshot.get(account.id)

        if (snapshot && snapshot.balance !== undefined && snapshot.tags) {
          // 使用快照余额，按快照的标签分组
          const balance = snapshot.balance
          snapshot.tags.forEach((tag: string) => {
            // 如果有标签筛选，只计算筛选后的标签
            if (options?.tagFilter && options.tagFilter.length > 0) {
              if (options.tagFilter.includes(tag)) {
                tagAmountMap.set(tag, (tagAmountMap.get(tag) || 0) + balance)
              }
            } else {
              tagAmountMap.set(tag, (tagAmountMap.get(tag) || 0) + balance)
            }
          })
        } else {
          // 没有快照，使用当前余额
          // 这种情况下，我们无法知道标签，所以跳过
          // 或者可以给账户打一个默认标签（如"未分类"）
        }

        // 计算总资产（使用账户当前余额）
        totalAssets += account.balance
      })

      // 转换为 TagAsset 数组
      const tagAssets: TagAsset[] = Array.from(tagAmountMap.entries())
        .map(([tag, amount], index) => ({
          tag,
          amount,
          percentage: totalAssets > 0 ? (amount / totalAssets) * 100 : 0,
          color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        }))
        .sort((a, b) => b.amount - a.amount) // 按金额降序排序

      result.push({
        currency,
        tagAssets,
        totalAssets,
      })
    })

    // 按币种名称排序
    return result.sort((a, b) => a.currency.localeCompare(b.currency))
  }, [accounts, transactions, options?.tagFilter])
}

/**
 * 从交易记录中获取所有实际使用的标签列表
 */
export function useAvailableTags(): string[] {
  const transactions = useTransactionStore((state) => state.transactions)

  return useMemo(() => {
    const tagSet = new Set<string>()

    // 只添加交易中实际使用的标签
    transactions.forEach((txn) => {
      txn.tags?.forEach((tag: string) => tagSet.add(tag))
    })

    return Array.from(tagSet).sort()
  }, [transactions])
}
