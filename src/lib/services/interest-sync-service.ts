import { differenceInMonths, endOfMonth, startOfMonth, differenceInDays } from 'date-fns'

import { useAccountStore } from '@/lib/stores/account-store'
import { useTransactionStore } from '@/lib/stores/transaction-store'
import { AccountType, TransactionType } from '@/types'

import { FixedDepositService } from './fixed-deposit-service'

/**
 * 利息同步服务
 * 应用启动时检查所有定期账户，补生成遗漏的利息和月末快照
 */
export class InterestSyncService {
  /**
   * 同步所有定期存款账户的利息
   */
  static syncAllInterest(): void {
    console.log(
      `%c[InterestSync] ========== 开始同步利息 ==========`,
      'color: #ff00ff; font-size: 14px; font-weight: bold;'
    )

    const accounts = useAccountStore
      .getState()
      .accounts.filter((acc) => acc.type === AccountType.FIXED_DEPOSIT && acc.fixedDepositConfig)

    const { transactions, addTransaction } = useTransactionStore.getState()

    console.log(
      `%c[InterestSync] 检查 ${accounts.length} 个定期存款账户`,
      'color: #00ff00; font-weight: bold;'
    )

    if (accounts.length === 0) {
      console.warn(`[InterestSync] ⚠️ 没有找到定期存款账户`)
    }

    // 列出所有定期存款账户及其到期日
    accounts.forEach((account) => {
      const maturityDate = new Date(account.fixedDepositConfig!.maturityDate)
      const today = new Date()
      const isMatured = today >= maturityDate
      console.log(
        `  - ${account.name}: 到期日 ${maturityDate.toLocaleDateString('zh-CN')} ${isMatured ? '✅(已到期)' : '(未到期)'}`
      )
    })

    accounts.forEach((account) => {
      this.syncAccountInterest(account, transactions, addTransaction)
    })

    console.log(
      `%c[InterestSync] ========== 同步完成 ==========`,
      'color: #ff00ff; font-size: 14px; font-weight: bold;'
    )
  }

  /**
   * 同步单个账户的利息
   */
  private static syncAccountInterest(
    account: any,
    transactions: any[],
    addTransaction: (txn: any) => void
  ): void {
    if (!account.fixedDepositConfig) return

    const config = account.fixedDepositConfig
    const today = new Date()
    const { deleteTransaction } = useTransactionStore.getState()

    // 将 maturityDate 转换为 Date 对象（处理 localStorage 序列化）
    const maturityDate = new Date(config.maturityDate)
    const startDate = new Date(config.startDate)

    console.log(`\n[InterestSync] 检查账户 ${account.name}:`)
    console.log(`  - 起息日: ${startDate.toLocaleDateString('zh-CN')}`)
    console.log(`  - 到期日: ${maturityDate.toLocaleDateString('zh-CN')}`)
    console.log(`  - 今天: ${today.toLocaleDateString('zh-CN')}`)
    console.log(`  - 本金: ${config.principal}元`)
    console.log(`  - 年利率: ${config.interestRate}%`)
    console.log(`  - 付息频率: ${config.interestPaymentFrequency}`)

    // 清理旧的利息收入交易（INCOME类型且带有"利息"标签）
    const oldInterestTxns = transactions.filter(
      (txn) =>
        txn.accountId === account.id &&
        txn.type === TransactionType.INCOME &&
        txn.tags?.includes('利息')
    )

    if (oldInterestTxns.length > 0) {
      console.log(`  [清理] 找到 ${oldInterestTxns.length} 笔旧利息收入交易，准备删除...`)
      oldInterestTxns.forEach((txn) => {
        console.log(`    - 删除: ${txn.description} (${txn.amount}元)`)
        deleteTransaction(txn.id)
      })
      console.log(`  [清理] 已删除 ${oldInterestTxns.length} 笔旧利息交易`)
    }

    // 生成所有缺失的月度快照
    // 注意：即使账户已到期，也要生成到期前的历史快照
    // 对于已到期的账户，使用到期日作为截止日期
    const effectiveEndDate = today > maturityDate ? maturityDate : today

    const monthlyPayments = FixedDepositService.generateMonthlyInterestPayments(
      account,
      effectiveEndDate,
      transactions
    )

    console.log(
      `  - 有效截止日期: ${effectiveEndDate.toLocaleDateString('zh-CN')} ${today > maturityDate ? '(使用到期日)' : '(使用今天)'}`
    )

    console.log(`  - 生成月度快照数量: ${monthlyPayments.length} 笔`)

    // 批量添加月度快照交易
    monthlyPayments.forEach((payment) => {
      addTransaction(payment)
      const paymentDate =
        payment.createdAt instanceof Date ? payment.createdAt : new Date(payment.createdAt)

      const startDate =
        payment.interestPeriod?.startDate instanceof Date
          ? payment.interestPeriod.startDate
          : payment.interestPeriod?.startDate
            ? new Date(payment.interestPeriod.startDate)
            : null

      const endDate =
        payment.interestPeriod?.endDate instanceof Date
          ? payment.interestPeriod.endDate
          : payment.interestPeriod?.endDate
            ? new Date(payment.interestPeriod.endDate)
            : null

      console.log(`[InterestSync] 生成月度快照 ${account.name}:`)
      console.log(`  - 余额: ${payment.balance}元`)
      console.log(`  - 描述: ${payment.description}`)
      console.log(
        `  - 日期: ${paymentDate.toLocaleDateString('zh-CN')} ${paymentDate.toLocaleTimeString('zh-CN')}`
      )
      console.log(`  - 标签: ${payment.tags?.join(', ')}`)
      console.log(
        `  - 计息期间: ${startDate?.toLocaleDateString('zh-CN') || 'N/A'} - ${endDate?.toLocaleDateString('zh-CN') || 'N/A'}`
      )
    })

    if (monthlyPayments.length > 0) {
      console.log(`[InterestSync] ${account.name} 共生成 ${monthlyPayments.length} 笔月度快照`)
    }
  }
}
