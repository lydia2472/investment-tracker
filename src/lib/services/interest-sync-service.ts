import { useAccountStore } from '@/lib/stores/account-store'
import { useTransactionStore } from '@/lib/stores/transaction-store'
import { FixedDepositService } from './fixed-deposit-service'
import { AccountType, TransactionType } from '@/types'
import { differenceInMonths, endOfMonth, startOfMonth, differenceInDays } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'

/**
 * 利息同步服务
 * 应用启动时检查所有定期账户，补生成遗漏的利息和月末快照
 */
export class InterestSyncService {
  /**
   * 同步所有定期存款账户的利息
   */
  static syncAllInterest(): void {
    console.log(`%c[InterestSync] ========== 开始同步利息 ==========`, 'color: #ff00ff; font-size: 14px; font-weight: bold;')

    const accounts = useAccountStore.getState().accounts
    const { transactions, addTransaction } = useTransactionStore.getState()

    const fixedDepositAccounts = accounts.filter(
      acc => acc.type === AccountType.FIXED_DEPOSIT && acc.fixedDepositConfig
    )

    console.log(`%c[InterestSync] 检查 ${fixedDepositAccounts.length} 个定期存款账户`, 'color: #00ff00; font-weight: bold;')

    fixedDepositAccounts.forEach(account => {
      this.syncAccountInterest(account, transactions, addTransaction)
    })

    // 处理已到期的定期存款
    this.handleMaturedDeposits()

    console.log(`%c[InterestSync] ========== 同步完成 ==========`, 'color: #ff00ff; font-size: 14px; font-weight: bold;')
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
    const oldInterestTxns = transactions.filter(txn =>
      txn.accountId === account.id &&
      txn.type === TransactionType.INCOME &&
      txn.tags?.includes('利息')
    )

    if (oldInterestTxns.length > 0) {
      console.log(`  [清理] 找到 ${oldInterestTxns.length} 笔旧利息收入交易，准备删除...`)
      oldInterestTxns.forEach(txn => {
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

    console.log(`  - 有效截止日期: ${effectiveEndDate.toLocaleDateString('zh-CN')} ${today > maturityDate ? '(使用到期日)' : '(使用今天)'}`)

    console.log(`  - 生成月度快照数量: ${monthlyPayments.length} 笔`)

    // 批量添加月度快照交易
    monthlyPayments.forEach(payment => {
      addTransaction(payment)
      const paymentDate = payment.createdAt instanceof Date
        ? payment.createdAt
        : new Date(payment.createdAt)

      const startDate = payment.interestPeriod?.startDate instanceof Date
        ? payment.interestPeriod.startDate
        : payment.interestPeriod?.startDate
          ? new Date(payment.interestPeriod.startDate)
          : null

      const endDate = payment.interestPeriod?.endDate instanceof Date
        ? payment.interestPeriod.endDate
        : payment.interestPeriod?.endDate
          ? new Date(payment.interestPeriod.endDate)
          : null

      console.log(`[InterestSync] 生成月度快照 ${account.name}:`)
      console.log(`  - 余额: ${payment.balance}元`)
      console.log(`  - 描述: ${payment.description}`)
      console.log(`  - 日期: ${paymentDate.toLocaleDateString('zh-CN')} ${paymentDate.toLocaleTimeString('zh-CN')}`)
      console.log(`  - 标签: ${payment.tags?.join(', ')}`)
      console.log(`  - 计息期间: ${startDate?.toLocaleDateString('zh-CN') || 'N/A'} - ${endDate?.toLocaleDateString('zh-CN') || 'N/A'}`)
    })

    if (monthlyPayments.length > 0) {
      console.log(`[InterestSync] ${account.name} 共生成 ${monthlyPayments.length} 笔月度快照`)
    }
  }

  /**
   * 处理已到期的定期存款
   * 自动将本金转出到现金账户
   */
  private static handleMaturedDeposits(): void {
    const accounts = useAccountStore.getState().accounts
    const { transactions, addTransaction } = useTransactionStore.getState()

    // 查找已到期但未处理的定期存款账户
    const maturedDeposits = accounts.filter(account => {
      if (account.type !== AccountType.FIXED_DEPOSIT || !account.fixedDepositConfig) {
        return false
      }

      const maturityDate = new Date(account.fixedDepositConfig.maturityDate)
      const today = new Date()

      // 诊断日志
      console.log(`[到期检测] 账户: ${account.name}`)
      console.log(`  原始 maturityDate:`, account.fixedDepositConfig.maturityDate)
      console.log(`  解析后 maturityDate:`, maturityDate, `toString: ${maturityDate.toString()}`)
      console.log(`  today:`, today, `toString: ${today.toString()}`)
      console.log(`  today < maturityDate: ${today < maturityDate}`)
      console.log(`  today >= maturityDate (是否已到期): ${today >= maturityDate}`)

      // 检查日期有效性
      if (isNaN(maturityDate.getTime())) {
        console.error(`[到期检测] 无效的到期日: ${account.fixedDepositConfig.maturityDate}`)
        return false
      }

      // 检查是否已到期（包括到期当天）
      if (today < maturityDate) {
        console.log(`  → 未到期，跳过`)
        return false  // 未到期，不处理
      }

      console.log(`  → 已到期，将处理`)

      // 移除了"已处理过"的检查
      // 现在每次都会删除旧的转账交易并重新生成包含利息的完整转账
      return true
    })

    console.log(`[InterestSync] 发现 ${maturedDeposits.length} 个已到期定期存款`)

    // 处理每个到期账户
    maturedDeposits.forEach(account => {
      this.transferPrincipalToCash(account, addTransaction)
    })
  }

  /**
   * 将定期存款本金和利息转出到现金账户
   * @param account - 定期存款账户
   * @param addTransaction - 添加交易方法
   */
  private static transferPrincipalToCash(
    account: any,
    addTransaction: (txn: any) => void
  ): void {
    const config = account.fixedDepositConfig
    const principal = config.principal
    const currency = account.currency
    const { transactions, deleteTransaction } = useTransactionStore.getState()

    // 删除旧的到期转出交易（如果存在），确保重新生成包含利息的完整转账
    const oldTransferOutTxns = transactions.filter(txn =>
      txn.accountId === account.id &&
      txn.tags?.includes('到期转出')
    )

    // 同时删除对应的到期转入交易
    const oldTransferInTxns = transactions.filter(txn =>
      txn.tags?.includes('到期转入') &&
      txn.transferFromAccountId === account.id
    )

    if (oldTransferOutTxns.length > 0 || oldTransferInTxns.length > 0) {
      console.log(`  [清理] 删除 ${oldTransferOutTxns.length} 笔旧转出交易和 ${oldTransferInTxns.length} 笔旧转入交易`)
      ;[...oldTransferOutTxns, ...oldTransferInTxns].forEach(txn => {
        deleteTransaction(txn.id)
      })
    }

    // 计算从起息日到到期日的累积利息
    const startDate = new Date(config.startDate)
    const maturityDate = new Date(config.maturityDate)
    const totalInterest = FixedDepositService.calculateInterest(account, startDate, maturityDate)
    const totalAmount = principal + totalInterest

    console.log(`[InterestSync] ${account.name} 到期转账计算:`)
    console.log(`  本金: ${principal}元`)
    console.log(`  累积利息: ${totalInterest.toFixed(2)}元`)
    console.log(`  转出总额: ${totalAmount.toFixed(2)}元`)

    // 查找同货币的现金账户
    const cashAccounts = useAccountStore.getState().accounts.filter(
      acc => acc.type === AccountType.CASH && acc.currency === currency
    )

    if (cashAccounts.length === 0) {
      console.warn(`[InterestSync] ${account.name} 已到期，但找不到 ${currency} 现金账户`)
      return
    }

    // 优先选择余额为0或最小的现金账户
    const targetAccount = cashAccounts.sort((a, b) => a.balance - b.balance)[0]

    const transferDate = new Date(config.maturityDate)

    // 生成转账交易对
    const transferId = uuidv4()

    // 定期存款账户：本金+利息转出
    addTransaction({
      accountId: account.id,
      type: TransactionType.TRANSFER_OUT,
      amount: totalAmount,
      transferToAccountId: targetAccount.id,
      transferPairId: transferId,
      description: `定期存款到期转出 (${targetAccount.name})`,
      tags: ['定期存款', '到期转出'],
      note: `本金: ${principal}元，利息: ${totalInterest.toFixed(2)}元，总额: ${totalAmount.toFixed(2)}元，到期日: ${transferDate.toLocaleDateString('zh-CN')}`,
      createdAt: transferDate,
      updatedAt: transferDate
    })

    // 现金账户：本金+利息转入
    addTransaction({
      accountId: targetAccount.id,
      type: TransactionType.TRANSFER_IN,
      amount: totalAmount,
      transferFromAccountId: account.id,
      transferPairId: transferId,
      description: `定期存款到期转入 (${account.name})`,
      tags: ['定期存款', '到期转入'],
      note: `本金: ${principal}元，利息: ${totalInterest.toFixed(2)}元，总额: ${totalAmount.toFixed(2)}元，到期日: ${transferDate.toLocaleDateString('zh-CN')}`,
      createdAt: transferDate,
      updatedAt: transferDate
    })

    console.log(`[InterestSync] ${account.name} 总额 ${totalAmount.toFixed(2)}元 已转出到 ${targetAccount.name}`)
  }
}
