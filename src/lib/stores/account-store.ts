import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { getDefaultRiskLevel } from '@/lib/utils/risk-level-helpers'
import { RiskLevel } from '@/types'
import { useHoldingStore } from './holding-store'
import { useSnapshotStore } from './snapshot-store'
import { useTransactionStore } from './transaction-store'
import { persistStorage } from './persist-storage'

import type { Account } from '@/types'

interface AccountState {
  accounts: Account[]
  version: number
  addAccount: (
    account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: Date | string }
  ) => Account
  updateAccount: (id: string, updates: Partial<Account>) => void
  /** 切换账户的归档状态（归档/取消归档） */
  toggleArchive: (id: string) => void
  moveAccount: (draggedId: string, targetId: string) => void
  deleteAccount: (id: string) => void
  deleteAccounts: (ids: string[]) => void
  getAccount: (id: string) => Account | undefined
  updateBalance: (id: string, newBalance: number) => void
  updateBalances: (updates: Map<string, number>) => void
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      version: 0,

      addAccount: (accountData) => {
        const accountCreatedAt =
          accountData.createdAt instanceof Date
            ? accountData.createdAt
            : accountData.createdAt
              ? new Date(accountData.createdAt)
              : new Date()
        const newAccount: Account = {
          ...accountData,
          riskLevel: accountData.riskLevel ?? getDefaultRiskLevel(),
          id: uuidv4(),
          createdAt: accountCreatedAt,
          updatedAt: new Date(),
        }
        set((state) => ({ accounts: [...state.accounts, newAccount] }))
        return newAccount
      },

      updateAccount: (id, updates) => {
        set((state) => {
          const updatedAccounts = state.accounts.map((acc) =>
            acc.id === id ? { ...acc, ...updates, updatedAt: new Date() } : acc
          )
          return {
            accounts: updatedAccounts,
            version: state.version + 1,
          }
        })
      },

      toggleArchive: (id) => {
        set((state) => {
          const updatedAccounts = state.accounts.map((acc) =>
            acc.id === id
              ? { ...acc, archived: !acc.archived, updatedAt: new Date() }
              : acc
          )
          return {
            accounts: updatedAccounts,
            version: state.version + 1,
          }
        })
      },

      moveAccount: (draggedId, targetId) => {
        if (!draggedId || !targetId || draggedId === targetId) {
          return
        }

        set((state) => {
          const fromIndex = state.accounts.findIndex((account) => account.id === draggedId)
          const toIndex = state.accounts.findIndex((account) => account.id === targetId)

          if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
            return state
          }

          const reorderedAccounts = [...state.accounts]
          const [draggedAccount] = reorderedAccounts.splice(fromIndex, 1)
          reorderedAccounts.splice(toIndex, 0, draggedAccount)

          return {
            accounts: reorderedAccounts,
            version: state.version + 1,
          }
        })
      },

      deleteAccount: (id) => {
        // 先删除该账户的所有交易、快照、持仓
        useTransactionStore.getState().deleteTransactionsByAccountIds([id])
        useSnapshotStore.getState().deleteSnapshotsByAccountIds([id])
        useHoldingStore.getState().removeHoldingByAccountId(id)

        // 再删除账户
        set((state) => ({
          accounts: state.accounts.filter((acc) => acc.id !== id),
        }))
      },

      deleteAccounts: (ids) => {
        // 先删除这些账户的所有交易、快照、持仓
        useTransactionStore.getState().deleteTransactionsByAccountIds(ids)
        useSnapshotStore.getState().deleteSnapshotsByAccountIds(ids)
        ids.forEach((id) => useHoldingStore.getState().removeHoldingByAccountId(id))

        // 再删除账户
        set((state) => ({
          accounts: state.accounts.filter((acc) => !ids.includes(acc.id)),
          version: state.version + 1,
        }))
      },

      getAccount: (id) => {
        return get().accounts.find((acc) => acc.id === id)
      },

      updateBalance: (id, newBalance) => {
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === id ? { ...acc, balance: newBalance, updatedAt: new Date() } : acc
          ),
        }))
      },

      updateBalances: (updates) => {
        if (updates.size === 0) {
          return
        }

        set((state) => {
          let changed = false
          const now = new Date()

          const accounts = state.accounts.map((account) => {
            const nextBalance = updates.get(account.id)
            if (nextBalance === undefined || nextBalance === account.balance) {
              return account
            }

            changed = true

            return {
              ...account,
              balance: nextBalance,
              updatedAt: now,
            }
          })

          return changed ? { accounts } : state
        })
      },
    }),
    {
      name: 'account-storage',
      storage: persistStorage,
      version: 2,
      // 添加版本迁移函数
      migrate: (persistedState: any, version: number) => {
        const oldState = persistedState as AccountState

        // 从版本0迁移到版本1
        if (version === 0) {
          console.log('[AccountStore] 迁移旧数据从版本0到版本1')
          return {
            ...oldState,
            version: 1,
          }
        }

        // 从版本1迁移到版本2：添加定期存款支持
        if (version === 1) {
          console.log('[AccountStore] 迁移到版本2：添加定期存款支持')

          // 为所有账户添加空配置（向后兼容）
          const migratedAccounts = oldState.accounts.map((acc) => ({
            ...acc,
            fixedDepositConfig: undefined, // 新字段，默认为 undefined
          }))

          return {
            ...oldState,
            accounts: migratedAccounts,
            version: 2,
          }
        }

        // 其他版本直接返回
        return oldState
      },
      // 添加合并策略，确保新数据优先
      merge: (persistedState: any, currentState: AccountState) => {
        return {
          ...currentState,
          ...persistedState,
          // 确保使用当前内存中的最新数据
          accounts: persistedState.accounts || currentState.accounts,
          version: persistedState.version || currentState.version,
        }
      },
    }
  )
)
