import { useAccountStore } from '@/lib/stores/account-store'
import { useTransactionStore } from '@/lib/stores/transaction-store'
import { FixedDepositService } from './fixed-deposit-service'
import { AccountType, TransactionType } from '@/types'
import type { FixedDepositConfig, Account } from '@/types'
import { v4 as uuidv4 } from 'uuid'

/**
 * 定期存款续存服务
 * 处理定期存款到期后的续存操作
 */
export class FixedDepositRenewalService {
  /**
   * 执行续存操作
   * 1. 执行转账交易
   * 2. 清理旧快照
   * 3. 更新账户配置
   * 4. 重新生成月度快照
   */
  static renewFixedDeposit(params: {
    fromAccountId: string
    toAccountId: string
    amount: number
    newConfig: Partial<FixedDepositConfig>
    transferDate?: Date
  }): void {
    const {
      fromAccountId,
      toAccountId,
      amount,
      newConfig,
      transferDate = new Date()
    } = params

    console.log(`%c[续存服务] ========== 开始续存 ==========`, 'color: #00ffff; font-size: 14px; font-weight: bold;')
    console.log(`[续存服务] 从账户 ${fromAccountId} → ${toAccountId}`)
    console.log(`[续存服务] 续存金额: ${amount.toFixed(2)}元`)

    // 步骤1: 执行转账
    this.executeTransfer(fromAccountId, toAccountId, amount, transferDate)
    console.log(`[续存服务] ✓ 转账完成`)

    // 步骤2: 清理旧快照
    this.cleanupOldSnapshots(toAccountId)
    console.log(`[续存服务] ✓ 旧快照清理完成`)

    // 步骤3: 更新账户配置
    this.updateAccountConfig(toAccountId, newConfig, amount)
    console.log(`[续存服务] ✓ 账户配置更新完成`)

    // 步骤4: 重新生成月度快照
    this.regenerateMonthlySnapshots(toAccountId)
    console.log(`[续存服务] ✓ 新月度快照生成完成`)

    console.log(`%c[续存服务] ========== 续存完成 ==========`, 'color: #00ffff; font-size: 14px; font-weight: bold;')
  }

  /**
   * 执行转账交易
   */
  private static executeTransfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    transferDate: Date
  ): void {
    const { transfer } = useTransactionStore.getState()

    transfer(fromAccountId, toAccountId, amount, '定期存款续存', transferDate)
  }

  /**
   * 清理旧的月度快照
   * 删除所有 month-end 标签的快照交易
   */
  private static cleanupOldSnapshots(accountId: string): void {
    const { transactions, deleteMultiple } = useTransactionStore.getState()

    // 筛选需要删除的快照交易
    const snapshotTxns = transactions.filter(t =>
      t.accountId === accountId &&
      t.isInterestPayment === true &&
      t.relatedFixedDepositId === accountId &&
      t.tags?.includes('month-end')
    )

    if (snapshotTxns.length > 0) {
      console.log(`[续存清理] 删除 ${snapshotTxns.length} 笔旧快照`)
      deleteMultiple(snapshotTxns.map(t => t.id))
    } else {
      console.log(`[续存清理] 没有需要删除的旧快照`)
    }
  }

  /**
   * 更新账户配置
   */
  private static updateAccountConfig(
    accountId: string,
    newConfig: Partial<FixedDepositConfig>,
    newPrincipal: number
  ): void {
    const { getAccount, updateAccount } = useAccountStore.getState()
    const account = getAccount(accountId)

    if (!account || !account.fixedDepositConfig) {
      console.error(`[续存配置] 账户 ${accountId} 不存在或不是定期存款账户`)
      return
    }

    // 合并配置
    const updatedConfig: FixedDepositConfig = {
      ...account.fixedDepositConfig,
      ...newConfig,
      principal: newPrincipal  // 使用转账金额作为新本金
    }

    console.log(`[续存配置] 更新配置:`)
    console.log(`  新起息日: ${new Date(updatedConfig.startDate).toLocaleDateString('zh-CN')}`)
    console.log(`  新到期日: ${new Date(updatedConfig.maturityDate).toLocaleDateString('zh-CN')}`)
    console.log(`  新本金: ${updatedConfig.principal}元`)
    console.log(`  新利率: ${updatedConfig.interestRate}%`)

    // 更新账户
    updateAccount(accountId, {
      fixedDepositConfig: updatedConfig,
      balance: newPrincipal,  // 更新账户余额为新本金
      initialBalance: newPrincipal  // 更新初始余额
    })
  }

  /**
   * 重新生成月度快照
   */
  private static regenerateMonthlySnapshots(accountId: string): void {
    const { getAccount } = useAccountStore.getState()
    const { addTransaction } = useTransactionStore.getState()
    const account = getAccount(accountId)

    if (!account || !account.fixedDepositConfig) {
      console.error(`[续存快照] 账户 ${accountId} 不存在或不是定期存款账户`)
      return
    }

    const today = new Date()

    // 生成新的月度快照（传入空数组，因为刚清理过）
    const monthlyPayments = FixedDepositService.generateMonthlyInterestPayments(
      account,
      today,
      [] // 空数组，因为刚清理过旧快照
    )

    // 批量添加
    monthlyPayments.forEach(payment => {
      addTransaction(payment)
    })

    console.log(`[续存快照] 生成 ${monthlyPayments.length} 笔新月度快照`)
  }

  /**
   * 检测是否为续存转账
   * 转账到已到期的定期存款账户
   */
  static isRenewalTransfer(toAccountId: string, amount: number): boolean {
    const { getAccount } = useAccountStore.getState()
    const toAccount = getAccount(toAccountId)

    if (!toAccount) return false
    if (toAccount.type !== AccountType.FIXED_DEPOSIT) return false
    if (!toAccount.fixedDepositConfig) return false

    const maturityDate = new Date(toAccount.fixedDepositConfig.maturityDate)
    const today = new Date()

    // 已到期且转入金额大于0
    return today >= maturityDate && amount > 0
  }
}
