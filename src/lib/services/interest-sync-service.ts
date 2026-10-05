import { useAccountStore } from '@/lib/stores/account-store'
import { useTransactionStore } from '@/lib/stores/transaction-store'
import { debugLog, debugWarn } from '@/lib/utils/debug-log'
import { Account, AccountType, Transaction, TransactionType } from '@/types'

import { FixedDepositService } from './fixed-deposit-service'

/**
 * 利息同步服务
 * 应用启动时检查所有定期账户，补生成遗漏的利息和月末快照
 */
export class InterestSyncService {
  /**
   * 同步所有定期存款账户的利息
   */
  static syncAllInterest(): boolean {
    const accounts = useAccountStore
      .getState()
      .accounts.filter((acc) => acc.type === AccountType.FIXED_DEPOSIT && acc.fixedDepositConfig)

    const transactionStore = useTransactionStore.getState()
    const { transactions } = transactionStore

    if (accounts.length === 0) {
      debugWarn('[InterestSync] 没有找到定期存款账户')
      return false
    }

    debugLog('[InterestSync] 开始同步利息，账户数:', accounts.length)

    let workingTransactions = [...transactions]
    const deleteIds: string[] = []
    const create: Array<Omit<Transaction, 'id' | 'updatedAt'>> = []

    accounts.forEach((account) => {
      const plan = this.createAccountSyncPlan(account, workingTransactions)
      if (plan.deleteIds.length === 0 && plan.create.length === 0) {
        return
      }

      workingTransactions = plan.workingTransactions
      deleteIds.push(...plan.deleteIds)
      create.push(...plan.create)
    })

    if (deleteIds.length === 0 && create.length === 0) {
      debugLog('[InterestSync] 没有需要同步的利息交易')
      return false
    }

    transactionStore.applyBulkChanges({
      create,
      deleteIds,
    })

    debugLog('[InterestSync] 同步完成', {
      deleted: deleteIds.length,
      created: create.length,
    })

    return true
  }

  /**
   * 同步单个账户的利息
   */
  private static createAccountSyncPlan(
    account: Account,
    transactions: Transaction[]
  ): {
    deleteIds: string[]
    create: Array<Omit<Transaction, 'id' | 'updatedAt'>>
    workingTransactions: Transaction[]
  } {
    if (!account.fixedDepositConfig) {
      return {
        deleteIds: [],
        create: [],
        workingTransactions: transactions,
      }
    }

    const config = account.fixedDepositConfig
    const today = new Date()

    // 将 maturityDate 转换为 Date 对象（处理 localStorage 序列化）
    const maturityDate = new Date(config.maturityDate)
    const startDate = new Date(config.startDate)

    debugLog(`[InterestSync] 检查账户 ${account.name}`, {
      startDate: startDate.toLocaleDateString('zh-CN'),
      maturityDate: maturityDate.toLocaleDateString('zh-CN'),
      interestRate: config.interestRate,
      paymentFrequency: config.interestPaymentFrequency,
    })

    // 清理旧的利息收入交易（INCOME类型且带有"利息"标签）
    const oldInterestTxns = transactions.filter(
      (txn) =>
        txn.accountId === account.id &&
        txn.type === TransactionType.INCOME &&
        txn.tags?.includes('利息')
    )

    const refreshedTransactions =
      oldInterestTxns.length > 0
        ? transactions.filter((txn) => !oldInterestTxns.some((oldTxn) => oldTxn.id === txn.id))
        : transactions

    // 生成所有缺失的月度快照
    // 注意：即使账户已到期，也要生成到期前的历史快照
    // 对于已到期的账户，使用到期日作为截止日期
    const effectiveEndDate = today > maturityDate ? maturityDate : today

    const monthlyPayments = FixedDepositService.generateMonthlyInterestPayments(
      account,
      effectiveEndDate,
      refreshedTransactions
    )

    debugLog(`[InterestSync] ${account.name} 同步结果`, {
      deletedInterestTransactions: oldInterestTxns.length,
      generatedPayments: monthlyPayments.length,
      effectiveEndDate: effectiveEndDate.toLocaleDateString('zh-CN'),
    })

    const create = monthlyPayments.map(({ updatedAt: _updatedAt, ...payment }) => ({
      ...payment,
      createdAt: payment.createdAt instanceof Date ? payment.createdAt : new Date(payment.createdAt),
    }))

    const workingCreatedTransactions: Transaction[] = monthlyPayments.map((payment, index) => ({
      ...payment,
      id: `interest-sync-${account.id}-${new Date(payment.createdAt).getTime()}-${index}`,
      createdAt: payment.createdAt instanceof Date ? payment.createdAt : new Date(payment.createdAt),
      updatedAt: payment.updatedAt instanceof Date ? payment.updatedAt : new Date(payment.updatedAt),
    }))

    return {
      deleteIds: oldInterestTxns.map((txn) => txn.id),
      create,
      workingTransactions: [...refreshedTransactions, ...workingCreatedTransactions],
    }
  }
}
