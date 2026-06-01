import { useAccountStore } from '@/lib/stores/account-store'
import { useTransactionStore } from '@/lib/stores/transaction-store'
import { AccountType, TransactionType, type Account } from '@/types'

import { FixedDepositService } from './fixed-deposit-service'

/**
 * 到期存款信息接口
 */
export interface MaturedDeposit {
  account: Account
  principal: number
  interest: number
  totalAmount: number
  maturityDate: Date
  currency: string
}

/**
 * 到期详情接口
 */
export interface MaturityDetails {
  principal: number
  interest: number
  totalAmount: number
  maturityDate: Date
  daysSinceMaturity: number
}

/**
 * 定期存款到期提醒服务
 * 负责检测已到期但未转账的定期存款
 */
export class MaturityReminderService {
  /**
   * 获取所有已到期但未转账的定期存款
   */
  static getMaturedDeposits(): MaturedDeposit[] {
    const accounts = useAccountStore.getState().accounts
    const { transactions } = useTransactionStore.getState()

    // 筛选定期存款账户
    const fixedDepositAccounts = accounts.filter(
      (acc) => acc.type === AccountType.FIXED_DEPOSIT && acc.fixedDepositConfig
    )

    // 检查每个定期存款是否已到期且未转账
    return fixedDepositAccounts
      .filter((account) => {
        if (!account.fixedDepositConfig) return false

        const maturityDate = new Date(account.fixedDepositConfig.maturityDate)
        const today = new Date()

        // 检查是否已到期
        if (today < maturityDate) return false

        // 检查是否已转账（是否存在到期转出交易）
        const hasTransferred = this.hasTransferred(account.id, transactions)

        return !hasTransferred
      })
      .map((account) => {
        const config = account.fixedDepositConfig!
        const startDate = new Date(config.startDate)
        const maturityDate = new Date(config.maturityDate)
        const principal = config.principal

        // 计算利息
        const interest = FixedDepositService.calculateInterest(account, startDate, maturityDate)
        const totalAmount = principal + interest

        return {
          account,
          principal,
          interest,
          totalAmount,
          maturityDate,
          currency: account.currency,
        }
      })
  }

  /**
   * 检查定期存款是否已转账（通过检查是否存在到期转出交易）
   */
  static hasTransferred(accountId: string, transactions?: any[]): boolean {
    const txns = transactions || useTransactionStore.getState().transactions

    // 检查是否存在到期转出交易
    const transferOutTxn = txns.find(
      (txn) =>
        txn.accountId === accountId &&
        txn.type === TransactionType.TRANSFER_OUT &&
        txn.tags?.includes('到期转出')
    )

    // 如果存在转出交易，检查对应的转入交易是否也存在
    if (transferOutTxn) {
      const correspondingTransferIn = txns.find(
        (txn) =>
          txn.transferPairId === transferOutTxn.transferPairId &&
          txn.type === TransactionType.TRANSFER_IN &&
          txn.tags?.includes('到期转入') &&
          txn.transferFromAccountId === accountId
      )

      return !!correspondingTransferIn
    }

    return false
  }

  /**
   * 获取定期存款的到期详情（本金、利息、总额）
   */
  static getMaturityDetails(account: Account): MaturityDetails | null {
    if (!account.fixedDepositConfig) {
      return null
    }

    const config = account.fixedDepositConfig
    const startDate = new Date(config.startDate)
    const maturityDate = new Date(config.maturityDate)
    const principal = config.principal
    const today = new Date()

    // 计算利息
    const interest = FixedDepositService.calculateInterest(account, startDate, maturityDate)
    const totalAmount = principal + interest

    // 计算距离到期的天数
    const daysSinceMaturity = Math.floor(
      (today.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      principal,
      interest,
      totalAmount,
      maturityDate,
      daysSinceMaturity,
    }
  }

  /**
   * 检查定期存款是否已到期
   */
  static isMatured(account: Account): boolean {
    if (!account.fixedDepositConfig) {
      return false
    }

    const maturityDate = new Date(account.fixedDepositConfig.maturityDate)
    const today = new Date()

    return today >= maturityDate
  }

  /**
   * 检查定期存款是否已到期且未转账
   */
  static isMaturedAndNotTransferred(account: Account): boolean {
    if (!this.isMatured(account)) {
      return false
    }

    return !this.hasTransferred(account.id)
  }
}
