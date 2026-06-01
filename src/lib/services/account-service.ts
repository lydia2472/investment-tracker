import type { Account, AccountType } from '@/types'

export interface AccountStatistics {
  totalAssets: number
  accountCount: number
  accountsByType: Record<AccountType, Account[]>
  averageBalance: number
  maxBalance: number
  minBalance: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export class AccountService {
  /**
   * 计算账户统计数据
   */
  static calculateStatistics(accounts: Account[]): AccountStatistics {
    if (accounts.length === 0) {
      return {
        totalAssets: 0,
        accountCount: 0,
        accountsByType: {
          securities: [],
          bank: [],
          cash: [],
          fixed_deposit: [],
          fund: [],
          stock: [],
          gold: [],
          other: [],
        },
        averageBalance: 0,
        maxBalance: 0,
        minBalance: 0,
      }
    }

    const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0)
    const balances = accounts.map((acc) => acc.balance)
    const averageBalance = totalAssets / accounts.length
    const maxBalance = Math.max(...balances)
    const minBalance = Math.min(...balances)

    // 按类型分组
    const accountsByType = accounts.reduce(
      (acc, account) => {
        if (!acc[account.type]) {
          acc[account.type] = []
        }
        acc[account.type].push(account)
        return acc
      },
      {} as Record<AccountType, Account[]>
    )

    return {
      totalAssets,
      accountCount: accounts.length,
      accountsByType,
      averageBalance,
      maxBalance,
      minBalance,
    }
  }

  /**
   * 按类型分组账户
   */
  static groupByType(accounts: Account[]): Record<AccountType, Account[]> {
    return accounts.reduce(
      (acc, account) => {
        if (!acc[account.type]) {
          acc[account.type] = []
        }
        acc[account.type].push(account)
        return acc
      },
      {} as Record<AccountType, Account[]>
    )
  }

  /**
   * 验证账户数据
   */
  static validateAccount(account: Partial<Account>): ValidationResult {
    const errors: string[] = []

    if (!account.name || account.name.trim().length === 0) {
      errors.push('账户名称不能为空')
    }

    if (account.balance !== undefined && account.balance < 0) {
      errors.push('余额不能为负数')
    }

    if (account.initialBalance !== undefined && account.initialBalance < 0) {
      errors.push('初始余额不能为负数')
    }

    if (account.color && !/^#[0-9A-Fa-f]{6}$/.test(account.color)) {
      errors.push('颜色格式无效，应为十六进制格式（如 #3b82f6）')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 根据ID查找账户
   */
  static findById(accounts: Account[], id: string): Account | undefined {
    return accounts.find((acc) => acc.id === id)
  }

  /**
   * 按名称搜索账户
   */
  static searchByName(accounts: Account[], query: string): Account[] {
    const lowerQuery = query.toLowerCase()
    return accounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(lowerQuery) ||
        (acc.description && acc.description.toLowerCase().includes(lowerQuery))
    )
  }
}
