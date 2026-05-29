import { useAccountStore } from '@/lib/stores/account-store'
import { useTransactionStore } from '@/lib/stores/transaction-store'
import { FixedDepositService } from './fixed-deposit-service'
import { AccountType } from '@/types'
import { differenceInMonths } from 'date-fns'

/**
 * 利息同步服务
 * 应用启动时检查所有定期账户，补生成遗漏的利息
 */
export class InterestSyncService {
  /**
   * 同步所有定期存款账户的利息
   */
  static syncAllInterest(): void {
    const accounts = useAccountStore.getState().accounts
    const { transactions, addTransaction } = useTransactionStore.getState()

    const fixedDepositAccounts = accounts.filter(
      acc => acc.type === AccountType.FIXED_DEPOSIT && acc.fixedDepositConfig
    )

    console.log(`[InterestSync] 检查 ${fixedDepositAccounts.length} 个定期存款账户`)

    fixedDepositAccounts.forEach(account => {
      this.syncAccountInterest(account, transactions, addTransaction)
    })
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

    // 将 maturityDate 转换为 Date 对象（处理 localStorage 序列化）
    const maturityDate = new Date(config.maturityDate)

    // 已到期，不再生成利息
    if (today > maturityDate) {
      return
    }

    // 生成所有缺失的月度利息
    const monthlyPayments = FixedDepositService.generateMonthlyInterestPayments(
      account,
      today,
      transactions
    )

    // 批量添加利息交易
    monthlyPayments.forEach(payment => {
      addTransaction(payment)
      console.log(`[InterestSync] 生成月度利息 ${account.name}: ${payment.amount}元 (${payment.description})`)
    })

    if (monthlyPayments.length > 0) {
      console.log(`[InterestSync] ${account.name} 共生成 ${monthlyPayments.length} 笔月度利息`)
    }
  }
}
