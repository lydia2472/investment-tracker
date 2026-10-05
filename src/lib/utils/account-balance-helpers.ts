import { AccountType, TransactionType } from '@/types'

import type { Account, Transaction } from '@/types'

export function getTransactionBalanceDelta(
  transaction: Pick<Transaction, 'type' | 'amount'>
): number | null {
  const amount = Math.abs(transaction.amount || 0)

  if (
    transaction.type === TransactionType.INCOME ||
    transaction.type === TransactionType.DEPOSIT ||
    transaction.type === TransactionType.TRANSFER_IN ||
    transaction.type === TransactionType.INVESTMENT_PROFIT
  ) {
    return amount
  }

  if (
    transaction.type === TransactionType.CONSUMPTION ||
    transaction.type === TransactionType.TRANSFER_OUT ||
    transaction.type === TransactionType.LOAN ||
    transaction.type === TransactionType.INVESTMENT_LOSS
  ) {
    return -amount
  }

  return null
}

function getTransactionTime(transaction: Pick<Transaction, 'createdAt'>): number {
  return transaction.createdAt instanceof Date
    ? transaction.createdAt.getTime()
    : new Date(transaction.createdAt).getTime()
}

export function compareTransactionsByDate(a: Transaction, b: Transaction): number {
  return getTransactionTime(a) - getTransactionTime(b)
}

function shouldSkipBalanceDeltaForFixedDeposit(
  accountId: string,
  accountType: AccountType | undefined,
  transaction: Transaction
): boolean {
  return (
    accountType === AccountType.FIXED_DEPOSIT &&
    transaction.type === TransactionType.INCOME &&
    transaction.isInterestPayment === true &&
    transaction.relatedFixedDepositId === accountId
  )
}

export function calculateAccountBalanceFromTransactions(
  account: Account,
  transactions: Transaction[],
  targetDate?: Date
): number {
  const targetTime = targetDate?.getTime()

  const accountTransactions = transactions
    .filter((transaction) => {
      if (transaction.accountId !== account.id) {
        return false
      }

      if (targetTime === undefined) {
        return true
      }

      return getTransactionTime(transaction) <= targetTime
    })
    .sort(compareTransactionsByDate)

  let balance = account.initialBalance || 0

  accountTransactions.forEach((transaction) => {
    if (transaction.type === TransactionType.SNAPSHOT) {
      if (transaction.balance !== undefined) {
        balance = transaction.balance
      }
      return
    }

    if (shouldSkipBalanceDeltaForFixedDeposit(account.id, account.type, transaction)) {
      return
    }

    const delta = getTransactionBalanceDelta(transaction)
    if (delta !== null) {
      balance += delta
    }
  })

  return balance
}

export function calculateBalanceFromAnchor(
  accountId: string,
  initialBalance: number,
  transactions: Transaction[],
  startDate?: Date,
  endDate?: Date,
  accountType?: AccountType
): number {
  const startTime = startDate?.getTime()
  const endTime = endDate?.getTime()

  const accountTransactions = transactions
    .filter((transaction) => {
      if (transaction.accountId !== accountId) {
        return false
      }

      const transactionTime = getTransactionTime(transaction)

      if (startTime !== undefined && transactionTime <= startTime) {
        return false
      }

      if (endTime !== undefined && transactionTime > endTime) {
        return false
      }

      return true
    })
    .sort(compareTransactionsByDate)

  let balance = initialBalance

  accountTransactions.forEach((transaction) => {
    if (transaction.type === TransactionType.SNAPSHOT) {
      return
    }

    if (shouldSkipBalanceDeltaForFixedDeposit(accountId, accountType, transaction)) {
      return
    }

    const delta = getTransactionBalanceDelta(transaction)
    if (delta !== null) {
      balance += delta
    }
  })

  return balance
}
