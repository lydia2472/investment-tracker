import {
  Account,
  Transaction,
  CurrencyStatistics,
  MultiCurrencySummary,
  TransactionType,
  MonthReference,
} from '@/types'

import { calculateBalanceFromAnchor } from './account-balance-helpers'
import { calculateCurrentDisplayBalance, getAccountBalanceAtDate } from './snapshot-balance-helpers'

import type { DateRange } from '@/components/dashboard/date-filter-bar'
import type { Snapshot } from '@/lib/stores/snapshot-store'

// 货币配置（从 account-form.tsx 提取）
const CURRENCY_CONFIG = {
  CNY: { symbol: '¥', label: '人民币' },
  USD: { symbol: '$', label: '美元' },
  EUR: { symbol: '€', label: '欧元' },
  HKD: { symbol: 'HK$', label: '港币' },
  JPY: { symbol: '¥', label: '日元' },
} as const

export function getLatestSnapshotMonthReference(
  accounts: Account[],
  snapshots?: Snapshot[],
  endDate?: Date
): MonthReference | null {
  if (!snapshots || snapshots.length === 0) {
    return null
  }

  const validAccountIds = new Set(accounts.map((account) => account.id))
  const endTime =
    endDate instanceof Date ? endDate.getTime() : endDate ? new Date(endDate).getTime() : undefined

  let latestSnapshotTime = -Infinity
  let latestReference: MonthReference | null = null

  snapshots.forEach((snapshot) => {
    if (!validAccountIds.has(snapshot.accountId)) {
      return
    }

    const snapshotTime = new Date(snapshot.snapshotDate).getTime()
    if (Number.isNaN(snapshotTime)) {
      return
    }

    if (endTime !== undefined && snapshotTime > endTime) {
      return
    }

    if (snapshotTime > latestSnapshotTime) {
      const snapshotDate = new Date(snapshot.snapshotDate)
      latestSnapshotTime = snapshotTime
      latestReference = {
        year: snapshotDate.getFullYear(),
        month: snapshotDate.getMonth() + 1,
      }
    }
  })

  return latestReference
}

/**
 * 按货币分组账户和交易数据，计算各货币的统计信息
 * 收入包含 INCOME, DEPOSIT 类型
 * 支出包含 CONSUMPTION, LOAN 类型
 * @param accounts - 所有账户
 * @param transactions - 所有交易
 * @param dateRange - 可选的日期范围(资产按 endDate 回推，收支按区间筛选)
 * @param snapshots - 可选的快照数据(用于获取最新余额)
 */
export function groupByCurrency(
  accounts: Account[],
  transactions: Transaction[],
  dateRange?: DateRange,
  snapshots?: Snapshot[]
): MultiCurrencySummary {
  const endDate = dateRange?.endDate
  const endTime =
    endDate instanceof Date ? endDate.getTime() : endDate ? new Date(endDate).getTime() : undefined
  const startTime =
    dateRange?.startDate instanceof Date
      ? dateRange.startDate.getTime()
      : dateRange?.startDate
        ? new Date(dateRange.startDate).getTime()
        : undefined

  const accountCurrencyMap = new Map(accounts.map((account) => [account.id, account.currency]))
  const accountTransactionsMap = new Map<string, Transaction[]>()
  const referenceMonth = getLatestSnapshotMonthReference(accounts, snapshots, endDate)

  transactions.forEach((transaction) => {
    const existing = accountTransactionsMap.get(transaction.accountId)
    if (existing) {
      existing.push(transaction)
    } else {
      accountTransactionsMap.set(transaction.accountId, [transaction])
    }
  })

  const latestSnapshotByAccount = new Map<string, Snapshot>()
  snapshots?.forEach((snapshot) => {
    const snapshotTime = new Date(snapshot.snapshotDate).getTime()
    if (endTime !== undefined && snapshotTime > endTime) {
      return
    }

    const existing = latestSnapshotByAccount.get(snapshot.accountId)
    if (!existing || new Date(existing.snapshotDate).getTime() < snapshotTime) {
      latestSnapshotByAccount.set(snapshot.accountId, snapshot)
    }
  })

  // 辅助函数：获取账户余额（优先使用快照，其次回退到历史交易推算）
  const getAccountBalance = (account: Account): number => {
    const accountTransactions = accountTransactionsMap.get(account.id) || []
    const latestSnapshot = latestSnapshotByAccount.get(account.id)

    if (latestSnapshot) {
      if (endDate) {
        const snapshotDate =
          latestSnapshot.snapshotDate instanceof Date
            ? latestSnapshot.snapshotDate
            : new Date(latestSnapshot.snapshotDate)

        return calculateBalanceFromAnchor(
          account.id,
          latestSnapshot.balance,
          accountTransactions,
          snapshotDate,
          endDate,
          account.type
        )
      }

      // 无日期筛选（"全部"）：快照余额 + 快照后交易变动，与账户卡片口径一致
      return calculateCurrentDisplayBalance(account, transactions, snapshots || [])
    }

    // 无可用快照时，按截止日期回推历史余额
    if (endDate) {
      return getAccountBalanceAtDate(accountTransactions, account, endDate)
    }

    // 无日期筛选时：优先用最新快照余额（真实市值），避免 account.balance（交易累加）高估。
    // getLatestSnapshot 已在上方尝试过，这里能走到说明无快照，回退到 account.balance。
    return account.balance
  }

  // 1. 按货币分组账户
  const accountsByCurrency = accounts.reduce(
    (acc, account) => {
      if (!acc[account.currency]) {
        acc[account.currency] = []
      }
      acc[account.currency].push(account)
      return acc
    },
    {} as Record<string, Account[]>
  )

  // 2. 按货币分组交易（通过accountId查找账户货币）
  const filteredTransactions = transactions.filter((transaction) => {
    const txnTime =
      transaction.createdAt instanceof Date
        ? transaction.createdAt.getTime()
        : new Date(transaction.createdAt).getTime()

    if (startTime !== undefined && txnTime < startTime) return false
    if (endTime !== undefined && txnTime > endTime) return false
    return true
  })

  const transactionsByCurrency = filteredTransactions.reduce(
    (acc, transaction) => {
      const currency = accountCurrencyMap.get(transaction.accountId)
      if (currency) {
        if (!acc[currency]) {
          acc[currency] = {
            income: 0, // INCOME + DEPOSIT
            expense: 0, // CONSUMPTION + LOAN
            investmentNetProfit: 0, // INVESTMENT_PROFIT - INVESTMENT_LOSS
          }
        }

        // 统计收入类型（INCOME, DEPOSIT）
        if (
          transaction.type === TransactionType.INCOME ||
          transaction.type === TransactionType.DEPOSIT
        ) {
          acc[currency].income += transaction.amount || 0
        }

        // 支出统计（CONSUMPTION, LOAN）
        if (
          transaction.type === TransactionType.CONSUMPTION ||
          transaction.type === TransactionType.LOAN
        ) {
          acc[currency].expense += transaction.amount || 0
        }

        if (transaction.type === TransactionType.INVESTMENT_PROFIT) {
          acc[currency].investmentNetProfit += transaction.amount || 0
        }

        if (transaction.type === TransactionType.INVESTMENT_LOSS) {
          acc[currency].investmentNetProfit -= transaction.amount || 0
        }
      }
      return acc
    },
    {} as Record<
      string,
      {
        income: number
        expense: number
        investmentNetProfit: number
      }
    >
  )

  // 3. 构建货币统计数组
  const currencies: CurrencyStatistics[] = Object.keys(accountsByCurrency).map((currencyCode) => {
    const currencyAccounts = accountsByCurrency[currencyCode]
    const data = transactionsByCurrency[currencyCode] || {
      income: 0,
      expense: 0,
      investmentNetProfit: 0,
    }
    const config = CURRENCY_CONFIG[currencyCode as keyof typeof CURRENCY_CONFIG] || {
      symbol: currencyCode,
      label: currencyCode,
    }

    const accountBalances = currencyAccounts.reduce(
      (acc, account) => {
        acc[account.id] = getAccountBalance(account)
        return acc
      },
      {} as Record<string, number>
    )

    return {
      currency: currencyCode,
      symbol: config.symbol,
      totalAssets: Object.values(accountBalances).reduce((sum, balance) => sum + balance, 0),
      totalIncome: data.income, // INCOME + DEPOSIT
      totalExpense: data.expense, // CONSUMPTION + LOAN
      accountCount: currencyAccounts.length,
      netIncome: data.income - data.expense,
      investmentNetProfit: data.investmentNetProfit,
      accountBalances,
    }
  })

  // 4. 按总资产降序排序
  currencies.sort((a, b) => b.totalAssets - a.totalAssets)

  return {
    currencies,
    currencyCount: currencies.length,
    hasMultipleCurrencies: currencies.length > 1,
    referenceMonth,
  }
}
