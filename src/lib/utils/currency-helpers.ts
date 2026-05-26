import { Account, Transaction, CurrencyStatistics, MultiCurrencySummary } from '@/types'
import { TransactionType } from '@/types'

// 货币配置（从 account-form.tsx 提取）
const CURRENCY_CONFIG = {
  CNY: { symbol: '¥', label: '人民币' },
  USD: { symbol: '$', label: '美元' },
  EUR: { symbol: '€', label: '欧元' },
  HKD: { symbol: 'HK$', label: '港币' },
  JPY: { symbol: '¥', label: '日元' },
} as const

/**
 * 按货币分组账户和交易数据，计算各货币的统计信息
 * 收入包含 INCOME, DEPOSIT, TRANSFER_IN 类型
 * 支出包含 CONSUMPTION, TRANSFER_OUT, LOAN 类型
 */
export function groupByCurrency(
  accounts: Account[],
  transactions: Transaction[]
): MultiCurrencySummary {
  // 1. 按货币分组账户
  const accountsByCurrency = accounts.reduce((acc, account) => {
    if (!acc[account.currency]) {
      acc[account.currency] = []
    }
    acc[account.currency].push(account)
    return acc
  }, {} as Record<string, Account[]>)

  // 2. 按货币分组交易（通过accountId查找账户货币）
  const accountCurrencyMap = new Map(accounts.map(a => [a.id, a.currency]))

  const transactionsByCurrency = transactions.reduce((acc, transaction) => {
    const currency = accountCurrencyMap.get(transaction.accountId)
    if (currency) {
      if (!acc[currency]) {
        acc[currency] = {
          income: 0,           // INCOME + DEPOSIT + TRANSFER_IN
          expense: 0,          // CONSUMPTION + TRANSFER_OUT + LOAN
        }
      }

      // 统计收入类型（INCOME, DEPOSIT, TRANSFER_IN）
      if (transaction.type === TransactionType.INCOME ||
          transaction.type === TransactionType.DEPOSIT ||
          transaction.type === TransactionType.TRANSFER_IN) {
        acc[currency].income += (transaction.amount || 0)
      }

      // 支出统计（CONSUMPTION, TRANSFER_OUT, LOAN）
      if (transaction.type === TransactionType.CONSUMPTION ||
          transaction.type === TransactionType.TRANSFER_OUT ||
          transaction.type === TransactionType.LOAN) {
        acc[currency].expense += (transaction.amount || 0)
      }
    }
    return acc
  }, {} as Record<string, {
    income: number
    expense: number
  }>)

  // 3. 构建货币统计数组
  const currencies: CurrencyStatistics[] = Object.keys(accountsByCurrency).map(currencyCode => {
    const currencyAccounts = accountsByCurrency[currencyCode]
    const data = transactionsByCurrency[currencyCode] || {
      income: 0,
      expense: 0,
    }
    const config = CURRENCY_CONFIG[currencyCode as keyof typeof CURRENCY_CONFIG] || {
      symbol: currencyCode,
      label: currencyCode
    }

    return {
      currency: currencyCode,
      symbol: config.symbol,
      totalAssets: currencyAccounts.reduce((sum, acc) => sum + acc.balance, 0),
      totalIncome: data.income,                    // INCOME + DEPOSIT + TRANSFER_IN
      totalExpense: data.expense,                  // CONSUMPTION + TRANSFER_OUT + LOAN
      accountCount: currencyAccounts.length,
      netIncome: data.income - data.expense,
    }
  })

  // 4. 按总资产降序排序
  currencies.sort((a, b) => b.totalAssets - a.totalAssets)

  return {
    currencies,
    currencyCount: currencies.length,
    hasMultipleCurrencies: currencies.length > 1,
  }
}
