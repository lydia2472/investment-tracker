import { computeTransactionTotals } from '@/hooks/use-transaction-totals'
import { TransactionType, type Transaction } from '@/types'

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

const baseDate = new Date('2026-06-01T08:00:00.000Z')

const transactions: Transaction[] = [
  {
    id: 'profit-1',
    accountId: 'acc-1',
    type: TransactionType.INVESTMENT_PROFIT,
    amount: 100,
    createdAt: baseDate,
    updatedAt: baseDate,
  },
  {
    id: 'loss-1',
    accountId: 'acc-1',
    type: TransactionType.INVESTMENT_LOSS,
    amount: 80,
    createdAt: new Date('2026-06-02T08:00:00.000Z'),
    updatedAt: new Date('2026-06-02T08:00:00.000Z'),
  },
  {
    id: 'expense-1',
    accountId: 'acc-1',
    type: TransactionType.CONSUMPTION,
    amount: 50,
    createdAt: new Date('2026-06-03T08:00:00.000Z'),
    updatedAt: new Date('2026-06-03T08:00:00.000Z'),
  },
  {
    id: 'deposit-1',
    accountId: 'acc-1',
    type: TransactionType.DEPOSIT,
    amount: 20,
    createdAt: new Date('2026-06-04T08:00:00.000Z'),
    updatedAt: new Date('2026-06-04T08:00:00.000Z'),
  },
]

const profitAndLossTotals = computeTransactionTotals(transactions.slice(0, 2))
assert(
  profitAndLossTotals.totalAmount === 20,
  `profit/loss total amount expected 20, got ${profitAndLossTotals.totalAmount}`
)

const mixedTotals = computeTransactionTotals(transactions)
assert(mixedTotals.totalIncome === 20, `totalIncome expected 20, got ${mixedTotals.totalIncome}`)
assert(mixedTotals.totalExpense === 50, `totalExpense expected 50, got ${mixedTotals.totalExpense}`)
assert(mixedTotals.netAmount === -30, `netAmount expected -30, got ${mixedTotals.netAmount}`)
assert(mixedTotals.totalAmount === -10, `totalAmount expected -10, got ${mixedTotals.totalAmount}`)

console.log(
  JSON.stringify(
    {
      profitAndLossTotals,
      mixedTotals,
    },
    null,
    2
  )
)
console.log('transaction totals regression passed')
