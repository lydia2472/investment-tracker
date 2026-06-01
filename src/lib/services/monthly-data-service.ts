import { endOfMonth, startOfMonth, isLastDayOfMonth } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'

import { useAccountStore } from '@/lib/stores/account-store'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import { useTransactionStore } from '@/lib/stores/transaction-store'
import { TransactionType, type Transaction } from '@/types'

import type { Snapshot } from '@/lib/stores/snapshot-store'

/**
 * 月末数据处理结果
 */
export interface MonthlyDataResult {
  snapshot: Snapshot
  profitTransaction?: Transaction
  investmentTransaction?: Transaction
  hasPreviousSnapshot: boolean
  calculatedProfit?: number
}

/**
 * 月末数据处理服务
 *
 * 负责处理月末数据提交，包括：
 * - 创建快照记录
 * - 查找上月快照
 * - 计算收益
 * - 创建相关交易记录
 */
export class MonthlyDataService {
  /**
   * 处理月末数据提交
   */
  static processMonthlyData(data: {
    accountId: string
    snapshotAmount: number
    investmentAmount?: number
    snapshotDate: Date
    note?: string
  }): MonthlyDataResult {
    const { accountId, snapshotAmount, investmentAmount, snapshotDate, note } = data

    console.log(`\n[MonthlyDataService] ========== 处理月末数据 ==========`)
    console.log(`  账户ID: ${accountId}`)
    console.log(`  快照金额: ${snapshotAmount}`)
    console.log(`  投资金额: ${investmentAmount || 0}`)
    console.log(`  快照日期: ${snapshotDate.toLocaleDateString('zh-CN')}`)

    // 注意：不再强制验证快照日期必须是月末
    // 用户可以在任何日期创建快照记录
    // 1. 验证快照日期
    // if (!this.validateSnapshotDate(snapshotDate)) {
    //   throw new Error('快照日期必须是月末')
    // }

    // 2. 查找上月快照
    const previousSnapshot = useSnapshotStore
      .getState()
      .getPreviousMonthSnapshot(accountId, snapshotDate)
    const hasPreviousSnapshot = !!previousSnapshot

    // 判断是否为首月（没有上月快照）
    const isFirstMonth = !hasPreviousSnapshot

    console.log(
      `  上月快照: ${hasPreviousSnapshot ? previousSnapshot!.balance.toLocaleString() + '元' : '无'}`
    )
    console.log(`  是否首月: ${isFirstMonth ? '是' : '否'}`)

    // 3. 计算收益
    let calculatedProfit: number | undefined
    if (isFirstMonth) {
      // 首月收益计算
      const account = useAccountStore.getState().getAccount(accountId)
      if (account) {
        calculatedProfit = this.calculateFirstMonthProfit(
          snapshotAmount,
          account.initialBalance,
          investmentAmount || 0
        )
        console.log(
          `  首月收益: ${snapshotAmount} - ${account.initialBalance} - ${investmentAmount || 0} = ${calculatedProfit}`
        )
      }
    } else if (hasPreviousSnapshot && previousSnapshot) {
      // 非首月收益计算
      calculatedProfit = this.calculateProfit(
        snapshotAmount,
        previousSnapshot.balance,
        investmentAmount || 0
      )
      console.log(
        `  计算收益: ${snapshotAmount} - ${previousSnapshot.balance} - ${investmentAmount || 0} = ${calculatedProfit}`
      )
    }

    // 4. 创建快照记录
    const snapshot: Omit<Snapshot, 'id' | 'createdAt' | 'updatedAt'> = {
      accountId,
      balance: snapshotAmount,
      snapshotDate,
      investmentAmount,
      note,
    }

    useSnapshotStore.getState().addSnapshot(snapshot)

    // 获取创建的快照（添加 ID 和时间戳）
    const snapshots = useSnapshotStore.getState().getSnapshotsByAccount(accountId)
    const createdSnapshot = snapshots[0]

    const result: MonthlyDataResult = {
      snapshot: createdSnapshot,
      hasPreviousSnapshot,
      calculatedProfit,
    }

    // 5. 如果收益不为0，创建收益/亏损交易
    if (calculatedProfit !== undefined && calculatedProfit !== 0) {
      // 获取用于描述的日期（首月使用账户创建日期，非首月使用上月快照日期）
      const account = useAccountStore.getState().getAccount(accountId)
      const previousSnapshotDate =
        isFirstMonth && account ? new Date(account.createdAt) : previousSnapshot!.snapshotDate

      const profitTransaction = this.createProfitTransaction(
        accountId,
        calculatedProfit,
        snapshotDate,
        previousSnapshotDate
      )
      useTransactionStore.getState().addTransaction(profitTransaction)
      result.profitTransaction = profitTransaction
      console.log(
        `  ✓ 创建${isFirstMonth ? '首月' : ''}收益交易: ${calculatedProfit > 0 ? '+' : ''}${calculatedProfit}元`
      )
    }

    // 6. 如果有投资金额，创建投资交易
    if (investmentAmount && investmentAmount > 0) {
      const investmentTransaction = this.createInvestmentTransaction(
        accountId,
        investmentAmount,
        snapshotDate
      )
      useTransactionStore.getState().addTransaction(investmentTransaction)
      result.investmentTransaction = investmentTransaction
      console.log(`  ✓ 创建投资交易: ${investmentAmount}元`)
    }

    console.log(`[MonthlyDataService] ========== 处理完成 ==========\n`)

    return result
  }

  /**
   * 查找上月快照
   */
  static findPreviousSnapshot(accountId: string, currentDate: Date): Snapshot | null {
    return useSnapshotStore.getState().getPreviousMonthSnapshot(accountId, currentDate)
  }

  /**
   * 计算收益
   *
   * 公式：收益 = 本月快照 - 上月快照 - 本月投资
   */
  static calculateProfit(
    currentSnapshot: number,
    previousSnapshot: number,
    investmentAmount: number
  ): number {
    return currentSnapshot - previousSnapshot - investmentAmount
  }

  /**
   * 计算首月收益
   *
   * 公式：首月收益 = 月末快照 - 账户初始余额 - 本月投资
   */
  static calculateFirstMonthProfit(
    currentSnapshot: number,
    initialBalance: number,
    investmentAmount: number
  ): number {
    return currentSnapshot - initialBalance - investmentAmount
  }

  /**
   * 创建收益/亏损交易
   */
  private static createProfitTransaction(
    accountId: string,
    profit: number,
    snapshotDate: Date,
    previousSnapshotDate: Date
  ): Transaction {
    const isProfit = profit > 0
    const description = isProfit ? '月末收益' : '月末亏损'
    const tags = isProfit ? ['收益', '月末'] : ['亏损', '月末']

    return {
      id: uuidv4(),
      accountId,
      type: isProfit ? TransactionType.INVESTMENT_PROFIT : TransactionType.INVESTMENT_LOSS,
      amount: isProfit ? profit : -Math.abs(profit), // 盈利为正，亏损为负
      description: `${description} (${previousSnapshotDate.toLocaleDateString('zh-CN')} - ${snapshotDate.toLocaleDateString('zh-CN')})`,
      tags,
      note: `上月快照: ${previousSnapshotDate.toLocaleDateString('zh-CN')}\n本月快照: ${snapshotDate.toLocaleDateString('zh-CN')}\n${description}: ${Math.abs(profit).toFixed(2)}元`,
      createdAt: snapshotDate,
      updatedAt: snapshotDate,
    }
  }

  /**
   * 创建投资交易
   */
  private static createInvestmentTransaction(
    accountId: string,
    investmentAmount: number,
    snapshotDate: Date
  ): Transaction {
    return {
      id: uuidv4(),
      accountId,
      type: TransactionType.TRANSFER_IN,
      amount: investmentAmount,
      description: '本月新增投资',
      tags: ['投资', '月末'],
      note: `快照日期: ${snapshotDate.toLocaleDateString('zh-CN')}\n投资金额: ${investmentAmount.toFixed(2)}元`,
      createdAt: snapshotDate,
      updatedAt: snapshotDate,
    }
  }

  /**
   * 验证快照日期
   *
   * 快照日期必须是月末（月的最后一天）
   */
  static validateSnapshotDate(date: Date): boolean {
    return isLastDayOfMonth(date)
  }

  /**
   * 获取月末日期
   *
   * 如果传入的日期不是月末，返回该月的月末日期
   */
  static getMonthEndDate(date: Date): Date {
    return endOfMonth(date)
  }

  /**
   * 检查是否已存在快照
   *
   * 同一账户同一个月只能有一个快照
   */
  static hasSnapshotForMonth(accountId: string, date: Date): boolean {
    const snapshots = useSnapshotStore.getState().getSnapshotsByAccount(accountId)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)

    return snapshots.some((snapshot) => {
      const snapshotDate = new Date(snapshot.snapshotDate)
      return snapshotDate >= monthStart && snapshotDate <= monthEnd
    })
  }

  /**
   * 获取月的快照
   */
  static getSnapshotForMonth(accountId: string, date: Date): Snapshot | null {
    const snapshots = useSnapshotStore.getState().getSnapshotsByAccount(accountId)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)

    const found = snapshots.find((snapshot) => {
      const snapshotDate = new Date(snapshot.snapshotDate)
      return snapshotDate >= monthStart && snapshotDate <= monthEnd
    })

    return found || null
  }
}
