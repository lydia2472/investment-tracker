import { useMemo } from 'react';
import { TransactionType, TransactionCategory } from '../types';
import type { Transaction, AccountStatistics } from '../types';

export const useAccountStatistics = (
  transactions: Transaction[]
): AccountStatistics => {
  return useMemo(() => {
    const stats: AccountStatistics = {
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      transactionCount: transactions.length,
      lastTransactionDate: undefined,
      depositCount: 0,
      withdrawCount: 0,
      investmentGain: 0,
      investmentLoss: 0,
    };

    if (transactions.length === 0) return stats;

    transactions.forEach((txn) => {
      // 记录最后交易时间
      if (
        !stats.lastTransactionDate ||
        txn.createdAt > stats.lastTransactionDate
      ) {
        stats.lastTransactionDate = txn.createdAt;
      }

      // 根据类型统计
      if (txn.type === TransactionType.INCOME) {
        stats.totalIncome += txn.amount || 0;

        if (txn.category === TransactionCategory.DEPOSIT) {
          stats.depositCount++;
        } else if (txn.category === TransactionCategory.INVESTMENT_GAIN) {
          stats.investmentGain += txn.amount || 0;
        }
      } else if (txn.type === TransactionType.EXPENSE) {
        stats.totalExpense += txn.amount || 0;

        if (txn.category === TransactionCategory.WITHDRAW) {
          stats.withdrawCount++;
        } else if (txn.category === TransactionCategory.INVESTMENT_LOSS) {
          stats.investmentLoss += txn.amount || 0;
        }
      }
    });

    stats.netIncome = stats.totalIncome - stats.totalExpense;

    return stats;
  }, [transactions]);
};
