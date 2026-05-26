import type { Transaction } from '@/types'
import { TransactionType } from '@/types'

export interface IncomeExpenseResult {
  income: number
  expense: number
  net: number
}

export interface DateRangeResult {
  transactions: Transaction[]
  income: number
  expense: number
  net: number
}

export class TransactionService {
  /**
   * 计算收入和支出
   */
  static calculateIncomeExpense(transactions: Transaction[]): IncomeExpenseResult {
    const income = transactions
      .filter(t =>
        t.type === TransactionType.INCOME ||
        t.type === TransactionType.DEPOSIT ||
        t.type === TransactionType.TRANSFER_IN
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    const expense = transactions
      .filter(t =>
        t.type === TransactionType.CONSUMPTION ||
        t.type === TransactionType.TRANSFER_OUT
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    return {
      income,
      expense,
      net: income - expense,
    }
  }

  /**
   * 按日期范围过滤交易
   */
  static filterByDateRange(
    transactions: Transaction[],
    startDate: Date,
    endDate: Date
  ): Transaction[] {
    return transactions.filter(txn => {
      const txnDate = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
      return txnDate >= startDate && txnDate <= endDate
    })
  }

  /**
   * 按账户过滤交易
   */
  static filterByAccount(transactions: Transaction[], accountId: string): Transaction[] {
    return transactions.filter(txn => txn.accountId === accountId)
  }

  /**
   * 按类型过滤交易
   */
  static filterByType(transactions: Transaction[], type: TransactionType): Transaction[] {
    return transactions.filter(txn => txn.type === type)
  }

  /**
   * 获取指定日期范围的统计数据
   */
  static getDateRangeStats(
    transactions: Transaction[],
    startDate: Date,
    endDate: Date
  ): DateRangeResult {
    const filteredTransactions = this.filterByDateRange(transactions, startDate, endDate)
    const { income, expense, net } = this.calculateIncomeExpense(filteredTransactions)

    return {
      transactions: filteredTransactions,
      income,
      expense,
      net,
    }
  }

  /**
   * 按日期分组交易（用于图表数据）
   */
  static groupByDate(transactions: Transaction[]): Record<string, Transaction[]> {
    return transactions.reduce((acc, txn) => {
      const date = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
      const dateKey = date.toISOString().split('T')[0]
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(txn)
      return acc
    }, {} as Record<string, Transaction[]>)
  }

  /**
   * 按月份分组交易
   */
  static groupByMonth(transactions: Transaction[]): Record<string, Transaction[]> {
    return transactions.reduce((acc, txn) => {
      const date = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!acc[monthKey]) {
        acc[monthKey] = []
      }
      acc[monthKey].push(txn)
      return acc
    }, {} as Record<string, Transaction[]>)
  }

  /**
   * 计算每日余额变化
   */
  static calculateDailyBalance(
    transactions: Transaction[],
    initialBalance: number
  ): Array<{ date: string; balance: number }> {
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateA.getTime() - dateB.getTime()
    })

    const dailyBalances: Record<string, number> = {}
    let balance = initialBalance

    sortedTransactions.forEach(txn => {
      const date = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
      const dateKey = date.toISOString().split('T')[0]

      if (txn.type === TransactionType.INCOME ||
          txn.type === TransactionType.DEPOSIT ||
          txn.type === TransactionType.TRANSFER_IN) {
        balance += (txn.amount || 0)
      } else if (txn.type === TransactionType.CONSUMPTION ||
                 txn.type === TransactionType.TRANSFER_OUT ||
                 txn.type === TransactionType.LOAN) {
        balance -= (txn.amount || 0)
      }
      // 快照不影响总余额

      dailyBalances[dateKey] = balance
    })

    return Object.entries(dailyBalances).map(([date, balance]) => ({ date, balance }))
  }

  /**
   * 搜索交易
   */
  static search(transactions: Transaction[], query: string): Transaction[] {
    const lowerQuery = query.toLowerCase()
    return transactions.filter(txn =>
      txn.description?.toLowerCase().includes(lowerQuery) ||
      txn.note?.toLowerCase().includes(lowerQuery)
    )
  }
}
