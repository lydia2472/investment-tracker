import { useMemo } from 'react';
import { TransactionType } from '../types';
import type { Account, Transaction } from '../types';

export const useBalanceCalculation = (
  account: Account,
  transactions: Transaction[]
) => {
  const calculatedBalance = useMemo(() => {
    let balance = account.initialBalance;

    // 按时间排序交易记录
    const sortedTransactions = [...transactions].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    for (const txn of sortedTransactions) {
      if (txn.type === TransactionType.INCOME) {
        balance += txn.amount || 0;
      } else if (txn.type === TransactionType.EXPENSE) {
        balance -= txn.amount || 0;
      } else if (txn.type === TransactionType.SNAPSHOT) {
        balance = txn.balance || balance;
      }
    }

    return balance;
  }, [account.initialBalance, transactions]);

  return calculatedBalance;
};
