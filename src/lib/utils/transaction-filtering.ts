import { TransactionType } from '@/types'

import type { Transaction, Account } from '@/types'

export interface TransactionFilters {
  accountId?: string | string[]
  types?: TransactionType[]
  tags?: string[]
  search?: string
  /** 货币筛选（按交易所属账户的币种匹配） */
  currencies?: string[]
  dateRange?: {
    from?: Date
    to?: Date
  }
}

export function filterTransactions(
  transactions: Transaction[],
  accounts: Account[],
  filters?: TransactionFilters
): Transaction[] {
  if (!filters || Object.keys(filters).length === 0) {
    return transactions
  }

  // 账户搜索文本 = 名称 + 基金代码（搜索任一即可命中）
  const accountNameMap =
    filters.search || filters.accountId
      ? new Map(
          accounts.map((account) => [
            account.id,
            `${account.name} ${account.fundCode || ''}`.toLowerCase().trim(),
          ])
        )
      : null

  // 货币筛选需要账户→币种映射
  const accountCurrencyMap = filters.currencies
    ? new Map(accounts.map((account) => [account.id, account.currency]))
    : null

  return transactions.filter((txn) => {
    if (filters.accountId) {
      const accountIds = Array.isArray(filters.accountId) ? filters.accountId : [filters.accountId]
      if (!accountIds.includes(txn.accountId)) {
        return false
      }
    }

    // 货币筛选：按交易所属账户的币种匹配
    if (filters.currencies && filters.currencies.length > 0) {
      const txnCurrency = accountCurrencyMap?.get(txn.accountId) || ''
      if (!filters.currencies.includes(txnCurrency)) {
        return false
      }
    }

    if (filters.types && filters.types.length > 0) {
      if (filters.types.includes(TransactionType.TRANSFER)) {
        const isTransfer = !!(txn.transferToAccountId || txn.transferFromAccountId || txn.transferPairId)
        if (!isTransfer && !filters.types.includes(txn.type)) {
          return false
        }
      } else if (!filters.types.includes(txn.type)) {
        return false
      }
    }

    if (filters.dateRange) {
      const { from, to } = filters.dateRange
      const txnDate = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
      const startTime = from ? new Date(from) : null
      const endTime = to ? new Date(to) : null

      if (startTime) {
        startTime.setHours(0, 0, 0, 0)
      }

      if (endTime) {
        endTime.setHours(23, 59, 59, 999)
      }

      if (startTime && txnDate < startTime) {
        return false
      }

      if (endTime && txnDate > endTime) {
        return false
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      const hasBlankTagFilter = filters.tags.includes('__BLANK__')
      const regularTags = filters.tags.filter((tag) => tag !== '__BLANK__')

      if (hasBlankTagFilter) {
        const hasNoTags = !txn.tags || txn.tags.length === 0
        const hasMatchingRegularTag = regularTags.some((filterTag) => txn.tags?.includes(filterTag))

        if (!hasNoTags && !hasMatchingRegularTag) {
          return false
        }
      } else {
        if (!txn.tags || txn.tags.length === 0) {
          return false
        }

        const hasMatchingTag = filters.tags.some((filterTag) => txn.tags?.includes(filterTag))
        if (!hasMatchingTag) {
          return false
        }
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const accountName = accountNameMap?.get(txn.accountId) || ''
      const description = (txn.description || '').toLowerCase()
      const note = (txn.note || '').toLowerCase()

      if (
        !accountName.includes(searchLower) &&
        !description.includes(searchLower) &&
        !note.includes(searchLower)
      ) {
        return false
      }
    }

    return true
  })
}
