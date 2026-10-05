import { eachMonthOfInterval, format, startOfMonth } from 'date-fns'

import { TransactionType, type Transaction } from '@/types'

export interface CashflowSummary {
  income: number
  expense: number
  net: number
  investmentNetProfit: number
  count: number
}

export interface MonthlyCashflowPoint {
  date: string
  month: string
  income: number
  expense: number
}

export function calculateCashflowSummary(transactions: Transaction[]): CashflowSummary {
  const income = transactions
    .filter((t) => t.type === TransactionType.INCOME || t.type === TransactionType.DEPOSIT)
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const expense = transactions
    .filter((t) => t.type === TransactionType.CONSUMPTION || t.type === TransactionType.LOAN)
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const investmentNetProfit = transactions.reduce((sum, t) => {
    if (t.type === TransactionType.INVESTMENT_PROFIT) {
      return sum + (t.amount || 0)
    }

    if (t.type === TransactionType.INVESTMENT_LOSS) {
      return sum - (t.amount || 0)
    }

    return sum
  }, 0)

  return {
    income,
    expense,
    net: income - expense,
    investmentNetProfit,
    count: transactions.length,
  }
}

export function buildMonthlyCashflowTrend(
  transactions: Transaction[]
): MonthlyCashflowPoint[] {
  if (transactions.length === 0) return []

  const dates = transactions.map((t) =>
    t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)
  )
  const minDate = startOfMonth(new Date(Math.min(...dates.map((d) => d.getTime()))))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
  const months = eachMonthOfInterval({ start: minDate, end: maxDate })

  return months.map((month) => {
    const monthTransactions = transactions.filter((t) => {
      const txnDate = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)
      return (
        txnDate.getMonth() === month.getMonth() && txnDate.getFullYear() === month.getFullYear()
      )
    })

    const summary = calculateCashflowSummary(monthTransactions)

    return {
      date: format(month, 'yyyy-MM'),
      month: format(month, 'MM月'),
      income: summary.income,
      expense: summary.expense,
    }
  })
}
