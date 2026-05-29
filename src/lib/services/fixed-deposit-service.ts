import { Account, AccountType, TransactionType, FixedDepositConfig, InterestPaymentFrequency, Transaction } from '@/types'
import { differenceInMonths, differenceInDays, addMonths, addQuarters, addYears } from 'date-fns'

/**
 * 定期存款利息计算服务
 */
export class FixedDepositService {
  /**
   * 检查账户是否需要生成利息
   * @param account - 账户对象
   * @param asOfDate - 检查日期，默认为当前日期
   * @returns 是否需要生成利息
   */
  static shouldGenerateInterest(account: Account, asOfDate: Date = new Date()): boolean {
    if (account.type !== AccountType.FIXED_DEPOSIT || !account.fixedDepositConfig) {
      return false
    }

    const config = account.fixedDepositConfig

    // 将日期转换为 Date 对象（处理 localStorage 序列化）
    const maturityDate = new Date(config.maturityDate)

    // 检查是否已到期
    if (asOfDate > maturityDate) {
      return false
    }

    // 计算上次付息日期
    const lastPaymentDate = this.getLastInterestPaymentDate(account, asOfDate)
    const monthsSinceLastPayment = differenceInMonths(asOfDate, lastPaymentDate)

    // 根据付息频率判断是否需要付息
    switch (config.interestPaymentFrequency) {
      case InterestPaymentFrequency.MONTHLY:
        return monthsSinceLastPayment >= 1
      case InterestPaymentFrequency.QUARTERLY:
        return monthsSinceLastPayment >= 3
      case InterestPaymentFrequency.ANNUALLY:
        return monthsSinceLastPayment >= 12
      case InterestPaymentFrequency.MATURITY:
        return asOfDate >= maturityDate
      default:
        return false
    }
  }

  /**
   * 计算利息金额
   * @param account - 定期存款账户
   * @param startDate - 计息开始日期
   * @param endDate - 计息结束日期
   * @returns 利息金额（保留2位小数）
   */
  static calculateInterest(account: Account, startDate: Date | string, endDate: Date | string): number {
    if (!account.fixedDepositConfig) return 0

    const config = account.fixedDepositConfig
    const principal = config.principal
    const annualRate = config.interestRate / 100

    // 确保日期是 Date 对象（处理 localStorage 序列化）
    const start = new Date(startDate)
    const end = new Date(endDate)

    // 计算月份差（基于完整月份）
    const months = differenceInMonths(end, start)

    // 如果月份差为0，计算按月比例的利息
    if (months === 0) {
      const days = differenceInDays(end, start)
      // 不足一个月时，按天数比例计算
      const interest = principal * annualRate * (days / 365)
      return Math.round(interest * 100) / 100
    }

    // 简单利息计算: 本金 × 年利率 × (月份 / 12)
    const interest = principal * annualRate * (months / 12)

    return Math.round(interest * 100) / 100  // 保留2位小数
  }

  /**
   * 生成利息交易对象
   * @param account - 定期存款账户
   * @param asOfDate - 生成利息的日期，默认为当前日期
   * @returns 利息交易对象（不包含 id, createdAt, updatedAt）
   */
  static generateInterestTransaction(
    account: Account,
    asOfDate: Date = new Date()
  ): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> {
    const config = account.fixedDepositConfig!
    const lastPaymentDate = this.getLastInterestPaymentDate(account, asOfDate)

    const interestAmount = this.calculateInterest(account, lastPaymentDate, asOfDate)

    return {
      accountId: account.id,
      type: TransactionType.INCOME,
      amount: interestAmount,
      description: `定期存款利息 (${config.interestRate}%)`,
      isInterestPayment: true,
      relatedFixedDepositId: account.id,
      interestPeriod: {
        startDate: lastPaymentDate,
        endDate: asOfDate
      },
      tags: ['interest', 'fixed-deposit', 'auto-generated'],
      note: `年利率: ${config.interestRate}%, 计息期间: ${lastPaymentDate.toLocaleDateString('zh-CN')} - ${asOfDate.toLocaleDateString('zh-CN')}`
    }
  }

  /**
   * 获取上次付息日期
   * @param account - 定期存款账户
   * @param asOfDate - 参考日期
   * @returns 上次付息日期
   */
  private static getLastInterestPaymentDate(account: Account, asOfDate: Date): Date {
    const config = account.fixedDepositConfig!
    let lastDate = new Date(config.startDate)

    // 根据付息频率向前推算（使用月份计算，不使用天数）
    switch (config.interestPaymentFrequency) {
      case InterestPaymentFrequency.MONTHLY:
        while (differenceInMonths(asOfDate, addMonths(lastDate, 1)) >= 1) {
          lastDate = addMonths(lastDate, 1)
        }
        break
      case InterestPaymentFrequency.QUARTERLY:
        while (differenceInMonths(asOfDate, addQuarters(lastDate, 1)) >= 3) {
          lastDate = addQuarters(lastDate, 1)
        }
        break
      case InterestPaymentFrequency.ANNUALLY:
        while (differenceInMonths(asOfDate, addYears(lastDate, 1)) >= 12) {
          lastDate = addYears(lastDate, 1)
        }
        break
      case InterestPaymentFrequency.MATURITY:
        lastDate = new Date(config.startDate)
        break
    }

    return lastDate
  }

  /**
   * 为新创建的账户生成初始利息
   * 计算从起息日到今天的累计利息
   * @param account - 定期存款账户
   * @returns 利息交易对象（不包含 id, createdAt, updatedAt），如果不需要生成利息则返回 null
   */
  static generateInitialInterest(
    account: Account
  ): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> | null {
    if (!account.fixedDepositConfig) return null

    const config = account.fixedDepositConfig
    const today = new Date()

    // 将 startDate 转换为 Date 对象（处理 localStorage 序列化）
    const startDate = new Date(config.startDate)

    // 如果起息日在未来，不生成利息
    if (startDate > today) {
      return null
    }

    // 计算累计利息
    const interestAmount = this.calculateInterest(
      account,
      startDate,
      today
    )

    // 利息为0，不生成交易
    if (interestAmount <= 0) {
      return null
    }

    return {
      accountId: account.id,
      type: TransactionType.INCOME,
      amount: interestAmount,
      description: `定期存款初始利息 (${config.interestRate}%)`,
      isInterestPayment: true,
      relatedFixedDepositId: account.id,
      interestPeriod: {
        startDate: startDate,
        endDate: today
      },
      tags: ['interest', 'fixed-deposit', 'initial', 'auto-generated'],
      note: `年利率: ${config.interestRate}%, 计息期间: ${startDate.toLocaleDateString('zh-CN')} - ${today.toLocaleDateString('zh-CN')}`
    }
  }

  /**
   * 生成从起息日到指定日期的所有月度利息
   * @param account - 定期存款账户
   * @param asOfDate - 生成利息的截止日期，默认为当前日期
   * @param existingTransactions - 已存在的利息交易（用于避免重复）
   * @returns 月度利息交易数组
   */
  static generateMonthlyInterestPayments(
    account: Account,
    asOfDate: Date = new Date(),
    existingTransactions: Transaction[] = []
  ): Omit<Transaction, 'id'>[] {
    if (!account.fixedDepositConfig) return []

    const config = account.fixedDepositConfig
    const startDate = new Date(config.startDate)
    const endDate = asOfDate

    // 如果起息日在未来或起息日>=截止日期，不生成利息
    if (startDate >= endDate) {
      return []
    }

    const payments: Omit<Transaction, 'id'>[] = []

    // 获取已存在的利息交易的计息期间
    const existingPeriods = existingTransactions
      .filter(t => t.isInterestPayment && t.relatedFixedDepositId === account.id)
      .map(t => t.interestPeriod)
      .filter(period => period !== undefined)

    // 从起息日开始，按月生成利息
    let currentDate = startDate
    let monthIndex = 0

    while (true) {
      // 计算下个月的同一天（付息日）
      const nextMonth = addMonths(currentDate, 1)

      // 付息日就是下个月的同一天
      const paymentDate = nextMonth

      // 如果付息日在未来（超过今天），停止生成利息
      if (paymentDate > endDate) {
        break
      }

      // 检查这个期间是否已经生成过利息
      const alreadyExists = existingPeriods.some(period => {
        const periodStart = new Date(period!.startDate)
        // 比较年月（忽略日和时分秒）
        return periodStart.getFullYear() === currentDate.getFullYear() &&
               periodStart.getMonth() === currentDate.getMonth()
      })

      // 如果不存在，生成这笔月度利息（只在付息日已过或就是今天时）
      if (!alreadyExists) {
        const interestAmount = this.calculateInterest(account, currentDate, paymentDate)

        if (interestAmount > 0) {
          payments.push({
            accountId: account.id,
            type: TransactionType.INCOME,
            amount: interestAmount,
            description: `定期存款利息 (${config.interestRate}%) - ${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`,
            isInterestPayment: true,
            relatedFixedDepositId: account.id,
            interestPeriod: {
              startDate: currentDate,
              endDate: paymentDate
            },
            tags: ['定期存款'],
            note: `年利率: ${config.interestRate}%, 计息期间: ${currentDate.toLocaleDateString('zh-CN')} - ${paymentDate.toLocaleDateString('zh-CN')}`,
            // 设置交易日期为付息日期
            createdAt: paymentDate,
            updatedAt: paymentDate
          })
        }
      }

      // 移动到下个月
      currentDate = nextMonth

      // 安全限制：最多生成12年的利息（防止无限循环）
      monthIndex++
      if (monthIndex > 12 * 12) {
        break
      }
    }

    return payments
  }
}
