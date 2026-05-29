import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TransactionType } from '@/types';
import type { Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useAccountStore } from './account-store';

interface TransactionState {
  transactions: Transaction[];
  migrated: boolean;
  simplified: boolean;  // 标记是否已简化为4种类型
  addTransaction: (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: Date }
  ) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  deleteMultiple: (ids: string[]) => void;
  getTransaction: (id: string) => Transaction | undefined;
  getTransactionsByAccount: (accountId: string) => Transaction[];
  transfer: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description?: string,
    date?: Date
  ) => void;
  migrateTransactions: () => void;
  simplifyTransactionTypes: () => void;  // 新增：简化交易类型
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      migrated: false,
      simplified: false,  // 标记是否已简化为4种类型

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

          // 收入类型：增加余额
          if (transactionData.type === TransactionType.INCOME ||
              transactionData.type === TransactionType.DEPOSIT ||
              transactionData.type === TransactionType.TRANSFER_IN) {
            newBalance += transactionData.amount || 0;
          }
          // 支出类型：减少余额
          else if (transactionData.type === TransactionType.CONSUMPTION ||
                   transactionData.type === TransactionType.TRANSFER_OUT ||
                   transactionData.type === TransactionType.LOAN) {
            newBalance -= transactionData.amount || 0;
          }
          // 快照：设置绝对余额（包括月末快照）
          else if (transactionData.type === TransactionType.SNAPSHOT) {
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
          if (oldTransaction.type === TransactionType.INCOME ||
              oldTransaction.type === TransactionType.DEPOSIT ||
              oldTransaction.type === TransactionType.TRANSFER_IN) {
            balanceAdjustment -= oldTransaction.amount || 0;
          } else if (oldTransaction.type === TransactionType.CONSUMPTION ||
                     oldTransaction.type === TransactionType.TRANSFER_OUT ||
                     oldTransaction.type === TransactionType.LOAN) {
            balanceAdjustment += oldTransaction.amount || 0;
          }
          // SNAPSHOT 不计入，因为快照是设置绝对值

          // 计算新交易对余额的影响
          const newType = updates.type ?? oldTransaction.type;
          const newAmount = updates.amount ?? oldTransaction.amount;

          if (newType === TransactionType.INCOME ||
              newType === TransactionType.DEPOSIT ||
              newType === TransactionType.TRANSFER_IN) {
            balanceAdjustment += newAmount || 0;
          } else if (newType === TransactionType.CONSUMPTION ||
                     newType === TransactionType.TRANSFER_OUT ||
                     newType === TransactionType.LOAN) {
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
          if (transaction.type === TransactionType.INCOME ||
              transaction.type === TransactionType.DEPOSIT ||
              transaction.type === TransactionType.TRANSFER_IN) {
            // 删除收入：余额减少
            newBalance -= transaction.amount || 0;
          } else if (transaction.type === TransactionType.CONSUMPTION ||
                     transaction.type === TransactionType.TRANSFER_OUT ||
                     transaction.type === TransactionType.LOAN) {
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

      deleteMultiple: (ids) => {
        const updateBalance = useAccountStore.getState().updateBalance;
        const getAccount = useAccountStore.getState().getAccount;

        // 先收集所有要删除的交易
        const transactionsToDelete = ids
          .map((id) => get().transactions.find((txn) => txn.id === id))
          .filter((txn) => txn !== undefined) as Transaction[];

        if (transactionsToDelete.length === 0) return;

        // 批量删除交易
        set((state) => ({
          transactions: state.transactions.filter((txn) => !ids.includes(txn.id)),
        }));

        // 按账户分组，更新每个账户的余额
        const accountBalanceChanges = new Map<string, number>();

        transactionsToDelete.forEach((transaction) => {
          const currentChange = accountBalanceChanges.get(transaction.accountId) || 0;

          if (transaction.type === TransactionType.INCOME ||
              transaction.type === TransactionType.DEPOSIT ||
              transaction.type === TransactionType.TRANSFER_IN) {
            // 删除收入：余额减少
            accountBalanceChanges.set(
              transaction.accountId,
              currentChange - (transaction.amount || 0)
            );
          } else if (transaction.type === TransactionType.CONSUMPTION ||
                     transaction.type === TransactionType.TRANSFER_OUT ||
                     transaction.type === TransactionType.LOAN) {
            // 删除支出：余额增加
            accountBalanceChanges.set(
              transaction.accountId,
              currentChange + (transaction.amount || 0)
            );
          } else if (transaction.type === TransactionType.SNAPSHOT) {
            // 删除快照：不自动调整余额
            console.warn(`删除快照 ${transaction.id} 不会自动调整余额`);
          }
        });

        // 应用余额变更
        accountBalanceChanges.forEach((balanceChange, accountId) => {
          const account = getAccount(accountId);
          if (account) {
            updateBalance(accountId, account.balance + balanceChange);
          }
        });
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
        const transferId = uuidv4(); // 生成共享ID用于链接

        // 获取账户名称
        const fromAccount = useAccountStore.getState().accounts.find(acc => acc.id === fromAccountId);
        const toAccount = useAccountStore.getState().accounts.find(acc => acc.id === toAccountId);
        const fromAccountName = fromAccount?.name || fromAccountId;
        const toAccountName = toAccount?.name || toAccountId;

        // 源账户：TRANSFER_OUT（转出）
        addTransaction({
          accountId: fromAccountId,
          type: TransactionType.TRANSFER_OUT,
          amount,
          transferToAccountId: toAccountId,
          transferPairId: transferId,
          description: description || `转账至 ${toAccountName}`,
          createdAt: transactionDate,
        });

        // 目标账户：TRANSFER_IN（转入）
        addTransaction({
          accountId: toAccountId,
          type: TransactionType.TRANSFER_IN,
          amount,
          transferFromAccountId: fromAccountId,
          transferPairId: transferId,
          description: description || `从 ${fromAccountName} 转入`,
          createdAt: transactionDate,
        });
      },

      migrateTransactions: () => {
        const { transactions, migrated } = get();

        // 避免重复迁移
        if (migrated) {
          console.log('Transactions already migrated');
          return;
        }

        console.log('Starting transaction migration...');
        let migrationCount = 0;

        transactions.forEach((txn) => {
          // 类型断言以支持旧数据格式
          const oldTxn = txn as any;
          const oldType = oldTxn.type as string;
          const oldCategory = oldTxn.category as string;

          let newType: TransactionType = txn.type;
          let shouldRemoveCategory = false;

          // 根据 type + category 映射到新 type
          switch (oldType) {
            case 'income': // 旧类型 INCOME
              if (oldCategory === 'deposit') {
                newType = TransactionType.DEPOSIT;
                shouldRemoveCategory = true;
              }
              // Note: investment_gain and transfer_in categories removed in type simplification
              break;

            case 'salary': // 旧类型 SALARY
              if (oldCategory === 'deposit') {
                newType = TransactionType.DEPOSIT;
                shouldRemoveCategory = true;
              } else if (oldCategory === 'salary') {
                shouldRemoveCategory = true;
              }
              break;

            case 'expense': // 旧类型 EXPENSE
              if (oldCategory === 'withdraw') {
                newType = TransactionType.CONSUMPTION;  // WITHDRAW mapped to CONSUMPTION
                shouldRemoveCategory = true;
              }
              // Note: investment_loss and transfer_out categories removed in type simplification
              break;

            case 'snapshot': // SNAPSHOT
              shouldRemoveCategory = true;
              break;
          }

          // 更新类型
          if (newType !== txn.type) {
            set((state) => ({
              transactions: state.transactions.map((t) =>
                t.id === txn.id
                  ? { ...t, type: newType as any, updatedAt: new Date() }
                  : t
              ),
            }));
            migrationCount++;
          }

          // 移除分类字段
          if (oldCategory && shouldRemoveCategory) {
            set((state) => ({
              transactions: state.transactions.map((t) => {
                if (t.id === txn.id) {
                  const { category, ...rest } = t as any;
                  return { ...rest, updatedAt: new Date() };
                }
                return t;
              }),
            }));
          }
        });

        // 标记迁移完成
        set({ migrated: true });
        console.log(`Transaction migration completed. Updated ${migrationCount} transactions.`);
      },

      simplifyTransactionTypes: () => {
        const { transactions, simplified } = get();

        // 避免重复简化
        if (simplified) {
          console.log('Transaction types already simplified');
          return;
        }

        console.log('Starting transaction type simplification (9 types → 4 types)...');
        let updateCount = 0;
        let deleteCount = 0;

        // 第一遍：更新类型映射
        set((state) => ({
          transactions: state.transactions.map((txn) => {
            const oldTxn = txn as any;
            const oldType = oldTxn.type as string;
            let newType: TransactionType | null = txn.type;
            let shouldUpdate = false;

            // 类型映射
            switch (oldType) {
              case 'withdraw':  // WITHDRAW → CONSUMPTION
                newType = TransactionType.CONSUMPTION;
                shouldUpdate = true;
                break;

              case 'transfer_in':  // TRANSFER_IN → DEPOSIT (保持不变)
                newType = TransactionType.DEPOSIT;
                shouldUpdate = true;
                break;

              case 'transfer_out':  // TRANSFER_OUT → CONSUMPTION
                newType = TransactionType.CONSUMPTION;
                shouldUpdate = true;
                break;

              case 'investment_gain':  // INVESTMENT_GAIN → 删除
                console.warn(`删除投资收益交易: ${txn.id} - ${txn.description || '无描述'}`);
                deleteCount++;
                return null;

              case 'investment_loss':  // INVESTMENT_LOSS → 删除
                console.warn(`删除投资损失交易: ${txn.id} - ${txn.description || '无描述'}`);
                deleteCount++;
                return null;

              case 'transfer':  // TRANSFER 父类型 → 删除
                console.warn(`删除转账父类型交易: ${txn.id} - ${txn.description || '无描述'}`);
                deleteCount++;
                return null;

              default:
                // SALARY, DEPOSIT, SNAPSHOT, CONSUMPTION - 无变化
                break;
            }

            if (shouldUpdate && newType) {
              updateCount++;
              return { ...txn, type: newType, updatedAt: new Date() };
            }

            return txn;
          }).filter(txn => txn !== null) as Transaction[],
        }));

        // 标记简化完成
        set({ simplified: true });
        console.log(`Transaction type simplification completed. Updated ${updateCount} transactions, deleted ${deleteCount} transactions.`);
      },
    }),
    {
      name: 'transaction-storage',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        const oldState = persistedState as TransactionState

        // 从版本1迁移到版本2：添加利息追踪字段
        if (version === 1) {
          console.log('[TransactionStore] 迁移到版本2：添加利息追踪')

          const migratedTransactions = oldState.transactions.map(txn => ({
            ...txn,
            isInterestPayment: false,
            relatedFixedDepositId: undefined,
            interestPeriod: undefined
          }))

          return {
            ...oldState,
            transactions: migratedTransactions,
          }
        }

        // 版本0或无版本：返回旧状态
        return oldState
      }
    }
  )
);
