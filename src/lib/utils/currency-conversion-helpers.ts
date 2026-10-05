import { useExchangeRateStore, SupportedCurrency } from '@/lib/stores/exchange-rate-store'
import { Account, Transaction } from '@/types'

/**
 * 将金额从源货币转换为人民币
 * @param amount 金额
 * @param fromCurrency 源货币
 * @returns 人民币金额
 */
export function convertToCNY(amount: number, fromCurrency: SupportedCurrency): number {
  const store = useExchangeRateStore.getState()
  return store.convert(amount, fromCurrency, 'CNY')
}

/**
 * 将账户余额转换为人民币
 * @param account 账户对象
 * @returns 人民币余额
 */
export function convertAccountBalanceToCNY(account: Account): number {
  return convertToCNY(account.balance, account.currency as SupportedCurrency)
}

export function convertBalanceToCNY(balance: number, currency: string): number {
  return convertToCNY(balance, currency as SupportedCurrency)
}

/**
 * 将所有账户余额转换为人民币并求和
 * @param accounts 账户数组
 * @returns 总人民币金额
 */
export function sumAccountsInCNY(accounts: Account[]): number {
  return accounts.reduce((sum, account) => {
    return sum + convertAccountBalanceToCNY(account)
  }, 0)
}

/**
 * 将交易金额转换为人民币
 * @param transaction 交易对象
 * @param accounts 账户数组（用于查找交易所属账户的货币）
 * @returns 人民币金额
 */
export function convertTransactionToCNY(transaction: Transaction, accounts: Account[]): number {
  const account = accounts.find((a) => a.id === transaction.accountId)
  if (!account) return 0

  const amount = transaction.amount ?? 0
  return convertToCNY(amount, account.currency as SupportedCurrency)
}

/**
 * 将多笔交易金额转换为人民币并求和
 * @param transactions 交易数组
 * @param accounts 账户数组
 * @returns 总人民币金额
 */
export function sumTransactionsInCNY(transactions: Transaction[], accounts: Account[]): number {
  return transactions.reduce((sum, transaction) => {
    return sum + convertTransactionToCNY(transaction, accounts)
  }, 0)
}

/**
 * 按账户类型分组并转换为人民币
 * @param accounts 账户数组
 * @returns 按类型分组的人民币金额
 */
export function groupAccountsByTypeInCNY(accounts: Account[]): Record<string, number> {
  return accounts.reduce(
    (acc, account) => {
      const cnyAmount = convertAccountBalanceToCNY(account)
      acc[account.type] = (acc[account.type] || 0) + cnyAmount
      return acc
    },
    {} as Record<string, number>
  )
}

/**
 * 按风险等级分组并转换为人民币
 * @param accounts 账户数组
 * @returns 按风险等级分组的人民币金额
 */
export function groupAccountsByRiskInCNY(accounts: Account[]): Record<string, number> {
  return accounts.reduce(
    (acc, account) => {
      if (!account.riskLevel) return acc

      const cnyAmount = convertAccountBalanceToCNY(account)
      acc[account.riskLevel] = (acc[account.riskLevel] || 0) + cnyAmount
      return acc
    },
    {} as Record<string, number>
  )
}
