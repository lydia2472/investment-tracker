import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TransactionType, TransactionCategory } from '@/types';
import type { Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useAccountStore } from './account-store';

interface TransactionState {
  transactions: Transaction[];
  addTransaction: (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: Date }
  ) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  getTransaction: (id: string) => Transaction | undefined;
  getTransactionsByAccount: (accountId: string) => Transaction[];
  transfer: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description?: string,
    date?: Date
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
          createdAt: transactionData.createdAt || new Date(), // 使用传入的日期或当前时间
          updatedAt: new Date(),
        };

        set((state) => ({
          transactions: [...state.transactions, newTransaction],
        }));

        // 更新账户余额
        const updateBalance = useAccountStore.getState().updateBalance;
        const getAccount = useAccountStore.getState().getAccount;
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
        const oldTransaction = get().transactions.find((txn) => txn.id === id);

        if (!oldTransaction) return;

        // 更新交易
        set((state) => ({
          transactions: state.transactions.map((txn) =>
            txn.id === id
              ? { ...txn, ...updates, updatedAt: new Date() }
              : txn
          ),
        }));

        // 如果金额或类型发生变化，需要调整账户余额
        const updateBalance = useAccountStore.getState().updateBalance;
        const getAccount = useAccountStore.getState().getAccount;
        const account = getAccount(oldTransaction.accountId);

        if (account) {
          let balanceAdjustment = 0;

          // 计算旧交易对余额的影响
          if (oldTransaction.type === TransactionType.INCOME) {
            balanceAdjustment -= oldTransaction.amount || 0;
          } else if (oldTransaction.type === TransactionType.EXPENSE) {
            balanceAdjustment += oldTransaction.amount || 0;
          }
          // SNAPSHOT 不计入，因为快照是设置绝对值

          // 计算新交易对余额的影响
          const newType = updates.type ?? oldTransaction.type;
          const newAmount = updates.amount ?? oldTransaction.amount;

          if (newType === TransactionType.INCOME) {
            balanceAdjustment += newAmount || 0;
          } else if (newType === TransactionType.EXPENSE) {
            balanceAdjustment -= newAmount || 0;
          }
          // SNAPSHOT 不计入

          // 只有非快照类型才自动更新余额
          if (oldTransaction.type !== TransactionType.SNAPSHOT && newType !== TransactionType.SNAPSHOT) {
            const newBalance = account.balance + balanceAdjustment;
            updateBalance(oldTransaction.accountId, newBalance);
          } else if (newType === TransactionType.SNAPSHOT && updates.balance !== undefined) {
            // 如果更新为快照类型或有新的balance值，直接设置余额
            updateBalance(oldTransaction.accountId, updates.balance);
          }
        }
      },

      deleteTransaction: (id) => {
        const transaction = get().transactions.find((txn) => txn.id === id);

        if (!transaction) return;

        // 先删除交易
        set((state) => ({
          transactions: state.transactions.filter((txn) => txn.id !== id),
        }));

        // 回退账户余额
        const updateBalance = useAccountStore.getState().updateBalance;
        const getAccount = useAccountStore.getState().getAccount;
        const account = getAccount(transaction.accountId);

        if (account) {
          let newBalance = account.balance;

          // 反向操作：回退交易对余额的影响
          if (transaction.type === TransactionType.INCOME) {
            // 删除收入：余额减少
            newBalance -= transaction.amount || 0;
          } else if (transaction.type === TransactionType.EXPENSE) {
            // 删除支出：余额增加
            newBalance += transaction.amount || 0;
          } else if (transaction.type === TransactionType.SNAPSHOT) {
            // 删除快照：需要特殊处理
            // 选项1：找到上一个快照，恢复到那个余额
            // 选项2：不允许删除快照（提示用户）
            // 这里我们实现选项2：不更新余额，保持当前余额
            console.warn('删除快照不会自动调整余额，请手动记录新的快照');
          }

          // 只有非快照类型才自动更新余额
          if (transaction.type !== TransactionType.SNAPSHOT) {
            updateBalance(transaction.accountId, newBalance);
          }
        }
      },

      getTransaction: (id) => {
        return get().transactions.find((txn) => txn.id === id);
      },

      getTransactionsByAccount: (accountId) => {
        return get().transactions.filter((txn) => txn.accountId === accountId);
      },

      transfer: (fromAccountId, toAccountId, amount, description, date) => {
        const { addTransaction } = get();
        const transactionDate = date || new Date();

        // 转出记录
        addTransaction({
          accountId: fromAccountId,
          type: TransactionType.EXPENSE,
          category: TransactionCategory.TRANSFER_OUT,
          amount,
          transferToAccountId: toAccountId,
          description: description || '转账',
          createdAt: transactionDate,
        });

        // 转入记录
        addTransaction({
          accountId: toAccountId,
          type: TransactionType.INCOME,
          category: TransactionCategory.TRANSFER_IN,
          amount,
          transferFromAccountId: fromAccountId,
          description: description || '转账',
          createdAt: transactionDate,
        });
      },
    }),
    {
      name: 'transaction-storage',
    }
  )
);
