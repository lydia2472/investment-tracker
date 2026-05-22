import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TransactionType, TransactionCategory } from '../types';
import type { Transaction } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAccountStore } from './accountStore';

interface TransactionState {
  transactions: Transaction[];
  addTransaction: (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  getTransactionsByAccount: (accountId: string) => Transaction[];
  transfer: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description?: string
  ) => void;
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (transactionData) => {
        const newTransaction: Transaction = {
          ...transactionData,
          id: uuidv4(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          transactions: [...state.transactions, newTransaction],
        }));

        // 更新账户余额
        const { updateBalance, getAccount } = useAccountStore.getState();
        const account = getAccount(transactionData.accountId);

        if (account) {
          let newBalance = account.balance;

          if (transactionData.type === TransactionType.INCOME) {
            newBalance += transactionData.amount || 0;
          } else if (transactionData.type === TransactionType.EXPENSE) {
            newBalance -= transactionData.amount || 0;
          } else if (transactionData.type === TransactionType.SNAPSHOT) {
            newBalance = transactionData.balance || newBalance;
          }

          updateBalance(transactionData.accountId, newBalance);
        }
      },

      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map((txn) =>
            txn.id === id
              ? { ...txn, ...updates, updatedAt: new Date() }
              : txn
          ),
        }));
      },

      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((txn) => txn.id !== id),
        }));
      },

      getTransactionsByAccount: (accountId) => {
        return get().transactions.filter((txn) => txn.accountId === accountId);
      },

      transfer: (fromAccountId, toAccountId, amount, description) => {
        const { addTransaction } = get();
        const now = new Date();

        // 转出记录
        addTransaction({
          accountId: fromAccountId,
          type: TransactionType.EXPENSE,
          category: TransactionCategory.TRANSFER_OUT,
          amount,
          transferToAccountId: toAccountId,
          description: description || '转账',
          createdAt: now,
          updatedAt: now,
        });

        // 转入记录
        addTransaction({
          accountId: toAccountId,
          type: TransactionType.INCOME,
          category: TransactionCategory.TRANSFER_IN,
          amount,
          transferFromAccountId: fromAccountId,
          description: description || '转账',
          createdAt: now,
          updatedAt: now,
        });
      },
    }),
    {
      name: 'transaction-storage',
    }
  )
);
