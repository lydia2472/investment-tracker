import { v4 as uuidv4 } from 'uuid'
import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { calculateAccountBalanceFromTransactions, getTransactionBalanceDelta } from '@/lib/utils/account-balance-helpers'
import { AccountType, TransactionType } from '@/types'

import { useAccountStore } from './account-store'
import { persistStorage } from './persist-storage'
import { getGoldSnapshotValue } from '@/lib/utils/gold-profit-helpers'

import type { Transaction } from '@/types'

function recalculateAccountBalances(
  accountIds: string[],
  transactions: Transaction[]
) {
  const uniqueAccountIds = Array.from(new Set(accountIds))
  const accountStore = useAccountStore.getState()
  const balanceUpdates = new Map<string, number>()

  uniqueAccountIds.forEach((accountId) => {
    const account = accountStore.getAccount(accountId)
    if (!account) {
      return
    }

    // 黄金账户的余额 = 最新快照市值（均价×克数）+ 非收益类交易变动（放贷、消费等）。
    // 不能完全用交易重算（投资收益/亏损是派生数据，会高估），
    // 也不能完全跳过（放贷等交易必须影响余额）。
    // 折中方案：以快照市值为基准，再叠加"会影响持仓的非收益类交易"。
    if (account.type === AccountType.GOLD) {
      // 懒加载 snapshot-store 避免循环依赖
      const { useSnapshotStore } = require('./snapshot-store')
      const snapshots = useSnapshotStore.getState().snapshots
      const latestSnap = snapshots
        .filter((s: any) => s.accountId === accountId)
        .sort((a: any, b: any) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime())[0]

      if (!latestSnap) {
        // 无快照时不重算（避免清零）
        return
      }

      // 基准 = 快照市值
      let goldBalance = getGoldSnapshotValue(latestSnap)

      // 叠加该账户的非收益类交易变动（放贷、消费、转账等），排除投资收益/亏损
      const accountTxns = transactions.filter(
        (t) => t.accountId === accountId &&
        t.type !== TransactionType.INVESTMENT_PROFIT &&
        t.type !== TransactionType.INVESTMENT_LOSS &&
        t.type !== TransactionType.SNAPSHOT
      )
      for (const txn of accountTxns) {
        const delta = getTransactionBalanceDelta(txn)
        if (delta !== null) {
          goldBalance += delta
        }
      }

      if (Math.abs(goldBalance - account.balance) > 0.01) {
        balanceUpdates.set(accountId, goldBalance)
      }
      return
    }

    const nextBalance = calculateAccountBalanceFromTransactions(account, transactions)
    if (nextBalance !== account.balance) {
      balanceUpdates.set(accountId, nextBalance)
    }
  })

  accountStore.updateBalances(balanceUpdates)
}

interface TransactionBulkChanges {
  create?: Array<Omit<Transaction, 'id' | 'updatedAt'> & { createdAt?: Date }>
  update?: Array<{
    id: string
    updates: Partial<Transaction>
  }>
  deleteIds?: string[]
}

interface TransactionState {
  transactions: Transaction[]
  migrated: boolean
  simplified: boolean // 标记是否已简化为4种类型
  addTransaction: (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: Date }
  ) => void
  addTransactions: (
    transactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: Date }>
  ) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  deleteMultiple: (ids: string[]) => void
  applyBulkChanges: (changes: TransactionBulkChanges) => void
  getTransaction: (id: string) => Transaction | undefined
  getTransactionsByAccount: (accountId: string) => Transaction[]
  deleteTransactionsByAccountIds: (accountIds: string[]) => void
  transfer: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description?: string,
    date?: Date,
    options?: {
      transferOutTags?: string[]
      transferInTags?: string[]
    }
  ) => void
  migrateTransactions: () => void
  simplifyTransactionTypes: () => void // 新增：简化交易类型
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      migrated: false,
      simplified: false, // 标记是否已简化为4种类型

      addTransaction: (transactionData) => {
        const newTransaction: Transaction = {
          ...transactionData,
          id: uuidv4(),
          createdAt: transactionData.createdAt || new Date(), // 使用传入的日期或当前时间
          updatedAt: new Date(),
        }

        const nextTransactions = [...get().transactions, newTransaction]

        set({ transactions: nextTransactions })
        recalculateAccountBalances([newTransaction.accountId], nextTransactions)
      },

      addTransactions: (transactionsData) => {
        if (transactionsData.length === 0) {
          return
        }

        const now = new Date()
        const createdTransactions: Transaction[] = transactionsData.map((transactionData) => ({
          ...transactionData,
          id: uuidv4(),
          createdAt: transactionData.createdAt || now,
          updatedAt: now,
        }))

        const nextTransactions = [...get().transactions, ...createdTransactions]

        set({ transactions: nextTransactions })
        recalculateAccountBalances(
          createdTransactions.map((transaction) => transaction.accountId),
          nextTransactions
        )
      },

      updateTransaction: (id, updates) => {
        const oldTransaction = get().transactions.find((txn) => txn.id === id)

        if (!oldTransaction) return

        const newTransaction: Transaction = {
          ...oldTransaction,
          ...updates,
          updatedAt: new Date(),
        }

        const nextTransactions = get().transactions.map((txn) =>
          txn.id === id ? newTransaction : txn
        )

        set({ transactions: nextTransactions })
        recalculateAccountBalances(
          [oldTransaction.accountId, newTransaction.accountId],
          nextTransactions
        )
      },

      deleteTransaction: (id) => {
        const transaction = get().transactions.find((txn) => txn.id === id)

        if (!transaction) return

        // 成对转账保护：删除单条转账时，连带删除其配对交易，避免产生孤儿。
        // transfer_out 的配对是同 pairId 的 transfer_in，反之亦然。
        const idsToRemove = new Set<string>([id])
        if (transaction.transferPairId) {
          get()
            .transactions.filter(
              (txn) =>
                txn.transferPairId === transaction.transferPairId && txn.id !== id
            )
            .forEach((txn) => idsToRemove.add(txn.id))
        }

        const nextTransactions = get().transactions.filter(
          (txn) => !idsToRemove.has(txn.id)
        )
        const affectedAccountIds = [...new Set(nextTransactions.map((t) => t.accountId))]
        void affectedAccountIds // 仅用于语义占位，实际重算依赖原 accountId

        set({ transactions: nextTransactions })
        // 重算所有受影响账户（包括被删交易及其配对涉及的账户）
        const allAffected = new Set<string>()
        allAffected.add(transaction.accountId)
        get()
          .transactions.filter((t) => idsToRemove.has(t.id))
          .forEach((t) => allAffected.add(t.accountId))
        recalculateAccountBalances([...allAffected], nextTransactions)
      },

      deleteMultiple: (ids) => {
        const transactionsToDelete = ids
          .map((id) => get().transactions.find((txn) => txn.id === id))
          .filter((txn) => txn !== undefined) as Transaction[]

        if (transactionsToDelete.length === 0) return

        // 成对转账保护：如果删除的 ids 里有 transfer_in 但没有配对的 transfer_out，
        // 不要自动连带（避免删除范围意外扩大）。
        // 这里只确保"已经决定删除"的交易一起处理，不主动扩展删除范围。
        const idsSet = new Set(ids)

        const nextTransactions = get().transactions.filter((txn) => !idsSet.has(txn.id))
        const affectedAccountIds = transactionsToDelete.map((transaction) => transaction.accountId)

        set({ transactions: nextTransactions })
        recalculateAccountBalances(affectedAccountIds, nextTransactions)
      },

      applyBulkChanges: ({ create = [], update = [], deleteIds = [] }) => {
        if (create.length === 0 && update.length === 0 && deleteIds.length === 0) {
          return
        }

        const currentTransactions = get().transactions
        const deleteIdSet = new Set(deleteIds)
        const updateMap = new Map(update.map((item) => [item.id, item.updates]))
        const affectedAccountIds = new Set<string>()
        const now = new Date()

        const nextTransactions = currentTransactions
          .filter((transaction) => {
            if (!deleteIdSet.has(transaction.id)) {
              return true
            }

            affectedAccountIds.add(transaction.accountId)
            return false
          })
          .map((transaction) => {
            const updates = updateMap.get(transaction.id)
            if (!updates) {
              return transaction
            }

            affectedAccountIds.add(transaction.accountId)
            if (updates.accountId && updates.accountId !== transaction.accountId) {
              affectedAccountIds.add(updates.accountId)
            }

            return {
              ...transaction,
              ...updates,
              updatedAt: now,
            }
          })

        const createdTransactions: Transaction[] = create.map((transactionData) => {
          const createdAt = transactionData.createdAt || now
          affectedAccountIds.add(transactionData.accountId)

          return {
            ...transactionData,
            id: uuidv4(),
            createdAt,
            updatedAt: now,
          }
        })

        const mergedTransactions = [...nextTransactions, ...createdTransactions]

        set({ transactions: mergedTransactions })
        recalculateAccountBalances(Array.from(affectedAccountIds), mergedTransactions)
      },

      getTransaction: (id) => {
        return get().transactions.find((txn) => txn.id === id)
      },

      getTransactionsByAccount: (accountId) => {
        return get().transactions.filter((txn) => txn.accountId === accountId)
      },

      deleteTransactionsByAccountIds: (accountIds) => {
        const { deleteMultiple } = get()

        // 获取所有属于指定账户的交易ID
        const transactionIds = get()
          .transactions.filter((txn) => accountIds.includes(txn.accountId))
          .map((txn) => txn.id)

        // 批量删除这些交易
        if (transactionIds.length > 0) {
          deleteMultiple(transactionIds)
        }
      },

      transfer: (fromAccountId, toAccountId, amount, description, date, options) => {
        const { addTransaction } = get()
        const transactionDate = date || new Date()
        const transferId = uuidv4() // 生成共享ID用于链接

        // 获取账户名称
        const fromAccount = useAccountStore
          .getState()
          .accounts.find((acc) => acc.id === fromAccountId)
        const toAccount = useAccountStore.getState().accounts.find((acc) => acc.id === toAccountId)
        const fromAccountName = fromAccount?.name || fromAccountId
        const toAccountName = toAccount?.name || toAccountId

        // 源账户：TRANSFER_OUT（转出）
        addTransaction({
          accountId: fromAccountId,
          type: TransactionType.TRANSFER_OUT,
          amount,
          transferToAccountId: toAccountId,
          transferPairId: transferId,
          description: description || `转账至 ${toAccountName}`,
          tags: options?.transferOutTags,
          createdAt: transactionDate,
        })

        // 目标账户：TRANSFER_IN（转入）
        addTransaction({
          accountId: toAccountId,
          type: TransactionType.TRANSFER_IN,
          amount,
          transferFromAccountId: fromAccountId,
          transferPairId: transferId,
          description: description || `从 ${fromAccountName} 转入`,
          tags: options?.transferInTags,
          createdAt: transactionDate,
        })
      },

      migrateTransactions: () => {
        const { transactions, migrated } = get()

        // 避免重复迁移
        if (migrated) {
          console.log('Transactions already migrated')
          return
        }

        console.log('Starting transaction migration...')
        let migrationCount = 0

        transactions.forEach((txn) => {
          // 类型断言以支持旧数据格式
          const oldTxn = txn as any
          const oldType = oldTxn.type as string
          const oldCategory = oldTxn.category as string

          let newType: TransactionType = txn.type
          let shouldRemoveCategory = false

          // 根据 type + category 映射到新 type
          switch (oldType) {
            case 'income': // 旧类型 INCOME
              if (oldCategory === 'deposit') {
                newType = TransactionType.DEPOSIT
                shouldRemoveCategory = true
              }
              // Note: investment_gain and transfer_in categories removed in type simplification
              break

            case 'salary': // 旧类型 SALARY
              if (oldCategory === 'deposit') {
                newType = TransactionType.DEPOSIT
                shouldRemoveCategory = true
              } else if (oldCategory === 'salary') {
                shouldRemoveCategory = true
              }
              break

            case 'expense': // 旧类型 EXPENSE
              if (oldCategory === 'withdraw') {
                newType = TransactionType.CONSUMPTION // WITHDRAW mapped to CONSUMPTION
                shouldRemoveCategory = true
              }
              // Note: investment_loss and transfer_out categories removed in type simplification
              break

            case 'snapshot': // SNAPSHOT
              shouldRemoveCategory = true
              break
          }

          // 更新类型
          if (newType !== txn.type) {
            set((state) => ({
              transactions: state.transactions.map((t) =>
                t.id === txn.id ? { ...t, type: newType as any, updatedAt: new Date() } : t
              ),
            }))
            migrationCount++
          }

          // 移除分类字段
          if (oldCategory && shouldRemoveCategory) {
            set((state) => ({
              transactions: state.transactions.map((t) => {
                if (t.id === txn.id) {
                  const { category, ...rest } = t as any
                  return { ...rest, updatedAt: new Date() }
                }
                return t
              }),
            }))
          }
        })

        // 标记迁移完成
        set({ migrated: true })
        console.log(`Transaction migration completed. Updated ${migrationCount} transactions.`)
      },

      simplifyTransactionTypes: () => {
        const { transactions, simplified } = get()

        // 避免重复简化
        if (simplified) {
          console.log('Transaction types already simplified')
          return
        }

        console.log('Starting transaction type simplification (9 types → 4 types)...')
        let updateCount = 0
        let deleteCount = 0

        // 第一遍：更新类型映射
        set((state) => ({
          transactions: state.transactions
            .map((txn) => {
              const oldTxn = txn as any
              const oldType = oldTxn.type as string
              let newType: TransactionType | null = txn.type
              let shouldUpdate = false

              // 类型映射
              switch (oldType) {
                case 'withdraw': // WITHDRAW → CONSUMPTION
                  newType = TransactionType.CONSUMPTION
                  shouldUpdate = true
                  break

                case 'transfer_in': // TRANSFER_IN → DEPOSIT (保持不变)
                  newType = TransactionType.DEPOSIT
                  shouldUpdate = true
                  break

                case 'transfer_out': // TRANSFER_OUT → CONSUMPTION
                  newType = TransactionType.CONSUMPTION
                  shouldUpdate = true
                  break

                case 'investment_gain': // INVESTMENT_GAIN → 删除
                  console.warn(`删除投资收益交易: ${txn.id} - ${txn.description || '无描述'}`)
                  deleteCount++
                  return null

                case 'investment_loss': // INVESTMENT_LOSS → 删除
                  console.warn(`删除投资损失交易: ${txn.id} - ${txn.description || '无描述'}`)
                  deleteCount++
                  return null

                case 'transfer': // TRANSFER 父类型 → 删除
                  console.warn(`删除转账父类型交易: ${txn.id} - ${txn.description || '无描述'}`)
                  deleteCount++
                  return null

                default:
                  // SALARY, DEPOSIT, SNAPSHOT, CONSUMPTION - 无变化
                  break
              }

              if (shouldUpdate && newType) {
                updateCount++
                return { ...txn, type: newType, updatedAt: new Date() }
              }

              return txn
            })
            .filter((txn) => txn !== null) as Transaction[],
        }))

        // 标记简化完成
        set({ simplified: true })
        console.log(
          `Transaction type simplification completed. Updated ${updateCount} transactions, deleted ${deleteCount} transactions.`
        )
      },
    }),
    {
      name: 'transaction-storage',
      storage: persistStorage,
      version: 2,
      migrate: (persistedState: any, version: number) => {
        const oldState = persistedState as TransactionState

        // 从版本1迁移到版本2：添加利息追踪字段
        if (version === 1) {
          console.log('[TransactionStore] 迁移到版本2：添加利息追踪')

          const migratedTransactions = oldState.transactions.map((txn) => ({
            ...txn,
            isInterestPayment: false,
            relatedFixedDepositId: undefined,
            interestPeriod: undefined,
          }))

          return {
            ...oldState,
            transactions: migratedTransactions,
          }
        }

        // 版本0或无版本：返回旧状态
        return oldState
      },
    }
  )
)

/**
 * Selector to get displayable transactions (excludes SNAPSHOT and TRANSFER_IN types)
 * Use this selector to avoid infinite re-renders
 */
export function selectDisplayableTransactions(state: TransactionState): Transaction[] {
  return state.transactions.filter(
    (t) => t.type !== TransactionType.SNAPSHOT && t.type !== TransactionType.TRANSFER_IN
  )
}

/**
 * Hook to get displayable transactions with memoization
 * This prevents infinite re-renders by memoizing the filtered array
 */
export function useDisplayableTransactions(): Transaction[] {
  const transactions = useTransactionStore((state) => state.transactions)

  // Use useMemo to prevent creating new array references unnecessarily
  // Note: This hook must be used in a React component context
  return useMemo(() => {
    return transactions.filter(
      (t) => t.type !== TransactionType.SNAPSHOT && t.type !== TransactionType.TRANSFER_IN
    )
  }, [transactions])
}
