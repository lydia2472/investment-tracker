import { TransactionType, AccountType } from '@/types'
import type { Transaction, Account, MonthlyProfit, SnapshotPair, DashboardProfitSummary, DateRangeProfitSummary } from '@/types'
import {
  endOfMonth,
  startOfMonth,
  isLastDayOfMonth,
  format,
  differenceInMonths,
  addMonths
} from 'date-fns'

/**
 * 判断交易是否为月末快照
 */
export function isMonthEndSnapshot(transaction: Transaction): boolean {
  return (
    transaction.type === TransactionType.SNAPSHOT &&
    (transaction.tags?.includes('month-end') ?? false)
  )
}

/**
 * 查找指定账户的所有月末快照
 * 返回 Map，key 为 "YYYY-MM"，value 为快照交易
 */
export function findMonthEndSnapshots(
  transactions: Transaction[],
  accountId: string
): Map<string, Transaction> {
  const snapshots = transactions.filter(
    (txn) =>
      txn.accountId === accountId &&
      txn.type === TransactionType.SNAPSHOT &&
      (txn.tags?.includes('month-end') ?? false)
  )

  const map = new Map<string, Transaction>()
  snapshots.forEach((snapshot) => {
    const date = snapshot.createdAt instanceof Date
      ? snapshot.createdAt
      : new Date(snapshot.createdAt)
    const key = format(date, 'yyyy-MM')
    map.set(key, snapshot)
  })

  return map
}

/**
 * 获取指定期间内的所有交易（排除快照）
 */
export function getPeriodTransactions(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date,
  accountId: string
): Transaction[] {
  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)

  const result = transactions.filter((txn) => {
    if (txn.accountId !== accountId) return false

    const txnDate = txn.createdAt instanceof Date
      ? txn.createdAt
      : new Date(txn.createdAt)

    // 排除快照交易
    if (txn.type === TransactionType.SNAPSHOT) return false

    // 修复：从上月快照之后的第一天开始，到本月快照当天结束
    // 这样确保只包含本月（4月）的转入，不包含上月快照当天（3月31日）的转入
    const dayAfterStart = new Date(start)
    dayAfterStart.setDate(dayAfterStart.getDate() + 1)
    dayAfterStart.setHours(0, 0, 0, 0)

    const endOfDay = new Date(end)
    endOfDay.setHours(23, 59, 59, 999)

    return txnDate >= dayAfterStart && txnDate <= endOfDay
  })

  // 期间交易诊断日志
  const dayAfterStart = new Date(start)
  dayAfterStart.setDate(dayAfterStart.getDate() + 1)
  dayAfterStart.setHours(0, 0, 0, 0)

  const endOfDay = new Date(end)
  endOfDay.setHours(23, 59, 59, 999)

  // 检查是否包含利息交易
  const interestTxns = result.filter(txn => txn.tags?.includes('利息'))

  console.log(`\n[期间交易] 账户 ${accountId}`)
  console.log(`  期间范围: ${dayAfterStart.toLocaleDateString('zh-CN')} ${dayAfterStart.toLocaleTimeString('zh-CN')} - ${endOfDay.toLocaleDateString('zh-CN')} ${endOfDay.toLocaleTimeString('zh-CN')}`)
  console.log(`  期间交易总数: ${result.length}`)
  console.log(`  利息交易数量: ${interestTxns.length}`)

  if (interestTxns.length > 0) {
    console.log(`  包含 ${interestTxns.length} 笔利息交易:`)
    interestTxns.forEach(txn => {
      const txnDate = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
      console.log(`    - ${txn.description}: ${(txn.amount || 0).toFixed(2)}元 (${txnDate.toLocaleDateString('zh-CN')} ${txnDate.toLocaleTimeString('zh-CN')})`)
    })
  } else {
    console.log(`  ⚠️ 未找到利息交易，可能原因：`)
    console.log(`     1. 利息交易未生成`)
    console.log(`     2. 利息交易日期不在期间范围内`)
  }

  return result
}

/**
 * 计算指定快照对的月度收益
 */
export function calculateProfitForPeriod(
  startSnapshot: Transaction,
  endSnapshot: Transaction,
  periodTransactions: Transaction[],
  accountName: string,
  accountType: AccountType,
  account?: Account  // 新增：账户对象，用于检查定期存款到期状态
): MonthlyProfit {
  const startDate = startSnapshot.createdAt instanceof Date
    ? startSnapshot.createdAt
    : new Date(startSnapshot.createdAt)
  const endDate = endSnapshot.createdAt instanceof Date
    ? endSnapshot.createdAt
    : new Date(endSnapshot.createdAt)

  const startBalance = startSnapshot.balance || 0
  const endBalance = endSnapshot.balance || 0

  // 计算期间转入总额
  const periodTransferIn = periodTransactions
    .filter((txn) => txn.type === TransactionType.TRANSFER_IN)
    .reduce((sum, txn) => sum + (txn.amount || 0), 0)

  // 计算期间利息收入（带有"利息"标签的交易）
  // 对于定期存款利息，检查计息期间的结束日期是否在计算的月份内
  const periodInterestIncome = periodTransactions
    .filter((txn) => txn.tags?.includes('利息'))
    .filter((txn) => {
      // 如果利息有计息期间，检查计息期间的结束月份
      if (txn.interestPeriod?.endDate) {
        const periodEnd = txn.interestPeriod.endDate instanceof Date
          ? txn.interestPeriod.endDate
          : new Date(txn.interestPeriod.endDate)

        // 检查计息期间的结束日期是否与月末快照日期（endDate）在同一月份
        // 例如：1月30日到2月28日的利息，periodEnd=2月28日，endDate=2月28日 → 同月，计入
        // 例如：12月1日到12月30日的利息，periodEnd=12月30日，endDate=12月31日 → 同月，计入
        // 例如：1月1日到1月31日的利息，periodEnd=1月31日，endDate=2月28日 → 不同月，不计入
        return periodEnd.getFullYear() === endDate.getFullYear() &&
               periodEnd.getMonth() === endDate.getMonth()
      }
      // 非定期存款利息或没有计息期间的利息，默认计入
      return true
    })
    .reduce((sum, txn) => sum + (txn.amount || 0), 0)

  // 检查是否为定期存款
  let calculatedProfit: number
  if (accountType === AccountType.FIXED_DEPOSIT && account?.fixedDepositConfig) {
    // 定期存款：收益 = 期末余额 - 期初余额
    // 直接使用快照余额计算，不依赖 amount 字段
    calculatedProfit = endBalance - startBalance

    console.log(`\n[收益计算] ${accountName} - 定期存款`)
    console.log(`  收益计算方式: 按余额增量计算`)
    console.log(`  期初快照余额: ${startBalance.toFixed(2)}`)
    console.log(`  期末快照余额: ${endBalance.toFixed(2)}`)
    console.log(`  收益: ${calculatedProfit.toFixed(2)}`)
  } else {
    // 非定期存款：使用标准公式
    calculatedProfit = endBalance - startBalance - periodTransferIn + periodInterestIncome
  }

  // 计算收益率（处理除零情况，分母仍使用期初余额）
  const profitRate = startBalance > 0
    ? (calculatedProfit / startBalance) * 100
    : 0

  // 诊断日志：显示收益计算详情
  if (accountType === AccountType.FIXED_DEPOSIT && account?.fixedDepositConfig) {
    // 定期存款的简化日志
    console.log(`  期间: ${startDate.toLocaleDateString('zh-CN')} - ${endDate.toLocaleDateString('zh-CN')}`)
    console.log(`  收益率: ${profitRate.toFixed(2)}%`)
    console.log(`  ----------------------------------------`)
  } else {
    // 非定期存款的完整日志
    console.log(`\n[收益计算] ${accountName} (${accountType})`)
    console.log(`  期间: ${startDate.toLocaleDateString('zh-CN')} - ${endDate.toLocaleDateString('zh-CN')}`)
    console.log(`  月初快照余额: ${startBalance.toFixed(2)}`)
    console.log(`  月末快照余额: ${endBalance.toFixed(2)}`)
    console.log(`  期间转入: ${periodTransferIn.toFixed(2)}`)
    console.log(`  期间利息收入: ${periodInterestIncome.toFixed(2)} ${periodInterestIncome > 0 ? '✓' : ''}`)
    console.log(`  基础收益(不含利息): ${(endBalance - startBalance - periodTransferIn).toFixed(2)}`)
    console.log(`  最终收益(含利息): ${calculatedProfit.toFixed(2)} ${periodInterestIncome > 0 ? '(已加上利息)' : ''}`)
    console.log(`  收益率: ${profitRate.toFixed(2)}%`)
    console.log(`  ----------------------------------------`)
  }

  // 增强诊断日志

  const transferInTransactions = periodTransactions.filter(txn => txn.type === TransactionType.TRANSFER_IN)
  if (transferInTransactions.length === 0) {
  } else {
    transferInTransactions.forEach(txn => {
      const txnDate = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
    })
  }


  const periodIncome = periodTransactions
    .filter((txn) =>
      txn.type === TransactionType.INCOME ||
      txn.type === TransactionType.DEPOSIT
    )
    .reduce((sum, txn) => sum + (txn.amount || 0), 0)

  const periodExpense = periodTransactions
    .filter((txn) =>
      txn.type === TransactionType.CONSUMPTION ||
      txn.type === TransactionType.TRANSFER_OUT
    )
    .reduce((sum, txn) => sum + (txn.amount || 0), 0)

  return {
    year: endDate.getFullYear(),
    month: endDate.getMonth() + 1,
    accountId: endSnapshot.accountId,
    accountName,
    startBalance,
    endBalance,
    calculatedProfit,
    periodIncome,
    periodExpense,
    netFlow: periodIncome - periodExpense,
    profitRate,  // 新增：收益率
    hasCompleteData: true,
    startSnapshotId: startSnapshot.id,
    endSnapshotId: endSnapshot.id,
  }
}

/**
 * 计算所有账户的月度收益
 */
export function calculateMonthlyProfits(
  transactions: Transaction[],
  accounts: Account[]
): MonthlyProfit[] {
  const results: MonthlyProfit[] = []

  // 为每个账户计算月度收益
  accounts.forEach((account) => {
    const accountProfits = calculateAccountMonthlyProfits(
      transactions,
      account
    )
    results.push(...accountProfits)
  })

  // 按年份和月份排序
  const sorted = results.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    if (a.month !== b.month) return a.month - b.month
    return a.accountId.localeCompare(b.accountId)
  })

  // 找到最新月份并输出详细汇总
  if (sorted.length > 0) {
    const latestProfit = sorted[sorted.length - 1] // 已排序，最后一个是最新
    const latestYear = latestProfit.year
    const latestMonth = latestProfit.month

    // 筛选最新月份的所有账户收益
    const latestMonthProfits = sorted.filter(p => p.year === latestYear && p.month === latestMonth)

    latestMonthProfits.forEach(profit => {
      const transferIn = profit.endBalance - profit.startBalance - profit.calculatedProfit
    })

    // 汇总统计
    const totalStart = latestMonthProfits.reduce((sum, p) => sum + p.startBalance, 0)
    const totalEnd = latestMonthProfits.reduce((sum, p) => sum + p.endBalance, 0)
    const totalTransferIn = latestMonthProfits.reduce((sum, p) => {
      return sum + (p.endBalance - p.startBalance - p.calculatedProfit)
    }, 0)
    const totalProfit = latestMonthProfits.reduce((sum, p) => sum + p.calculatedProfit, 0)

  }

  return sorted
}

/**
 * 计算单个账户的月度收益
 */
export function calculateAccountMonthlyProfits(
  transactions: Transaction[],
  account: Account
): MonthlyProfit[] {
  const profits: MonthlyProfit[] = []

  // 查找该账户的所有月末快照
  const snapshotsMap = findMonthEndSnapshots(transactions, account.id)

  if (snapshotsMap.size === 0) {
    // 没有任何月末快照
    return profits
  }

  // 获取所有已排序的月份
  const sortedMonths = Array.from(snapshotsMap.keys()).sort()

  // 为每个月计算收益
  for (let i = 0; i < sortedMonths.length; i++) {
    const currentMonthKey = sortedMonths[i]
    const currentSnapshot = snapshotsMap.get(currentMonthKey)

    if (!currentSnapshot) continue

    // 如果是第一个月，没有月初快照，跳过
    if (i === 0) {
      continue
    }

    const previousMonthKey = sortedMonths[i - 1]
    const previousSnapshot = snapshotsMap.get(previousMonthKey)

    if (!previousSnapshot) continue

    // 获取期间交易
    const startDate = previousSnapshot.createdAt instanceof Date
      ? previousSnapshot.createdAt
      : new Date(previousSnapshot.createdAt)
    const endDate = currentSnapshot.createdAt instanceof Date
      ? currentSnapshot.createdAt
      : new Date(currentSnapshot.createdAt)

    const periodTransactions = getPeriodTransactions(
      transactions,
      startDate,
      endDate,
      account.id
    )

    // 快照对选择诊断日志

    // 计算收益
    const profit = calculateProfitForPeriod(
      previousSnapshot,
      currentSnapshot,
      periodTransactions,
      account.name,
      account.type,
      account  // 传递完整账户对象，用于检查定期存款到期状态
    )

    profits.push(profit)
  }

  // 2026年4月汇总日志
  const april2026Profits = profits.filter(p => p.year === 2026 && p.month === 4)
  if (april2026Profits.length > 0) {
    const totalStart = april2026Profits.reduce((sum, p) => sum + p.startBalance, 0)
    const totalEnd = april2026Profits.reduce((sum, p) => sum + p.endBalance, 0)
    const totalTransferIn = april2026Profits.reduce((sum, p) => {
      const transferIn = (p.endBalance - p.startBalance - p.calculatedProfit)
      return sum + transferIn
    }, 0)
    const totalProfit = april2026Profits.reduce((sum, p) => sum + p.calculatedProfit, 0)

  }

  return profits
}

/**
 * 获取最近的月度收益（用于仪表板摘要）
 */
export function getRecentMonthlyProfits(
  transactions: Transaction[],
  accounts: Account[],
  months: number = 6
): MonthlyProfit[] {
  const allProfits = calculateMonthlyProfits(transactions, accounts)

  // 获取最近的月份
  const now = new Date()
  const cutoffDate = addMonths(now, -months)

  return allProfits.filter((profit) => {
    const profitDate = new Date(profit.year, profit.month - 1)
    return profitDate >= cutoffDate
  })
}

/**
 * 计算总收益（用于仪表板统计）
 */
export function calculateTotalProfit(
  transactions: Transaction[],
  accounts: Account
): number {
  const profits = calculateAccountMonthlyProfits(transactions, accounts)
  return profits.reduce((sum, profit) => sum + profit.calculatedProfit, 0)
}

/**
 * 获取收益最高的月份
 */
export function getBestMonth(
  transactions: Transaction[],
  account: Account
): MonthlyProfit | null {
  const profits = calculateAccountMonthlyProfits(transactions, account)

  if (profits.length === 0) return null

  return profits.reduce((best, current) =>
    current.calculatedProfit > best.calculatedProfit ? current : best
  )
}

/**
 * 获取收益最低的月份
 */
export function getWorstMonth(
  transactions: Transaction[],
  account: Account
): MonthlyProfit | null {
  const profits = calculateAccountMonthlyProfits(transactions, account)

  if (profits.length === 0) return null

  return profits.reduce((worst, current) =>
    current.calculatedProfit < worst.calculatedProfit ? current : worst
  )
}

/**
 * 获取当月收益汇总（用于仪表板显示）
 * @param transactions 所有交易
 * @param accounts 所有账户
 * @param targetMonth 目标月份（默认：当前月份）
 * @param targetYear 目标年份（默认：当前年份）
 */
export function getCurrentMonthProfitSummary(
  transactions: Transaction[],
  accounts: Account[],
  targetMonth?: number,
  targetYear?: number
): DashboardProfitSummary {
  const now = new Date()
  const month = targetMonth ?? now.getMonth() + 1
  const year = targetYear ?? now.getFullYear()

  // 获取所有月度收益
  const allProfits = calculateMonthlyProfits(transactions, accounts)

  // 筛选当月数据
  const currentMonthProfits = allProfits.filter(
    p => p.year === year && p.month === month
  )

  if (currentMonthProfits.length === 0) {
    return {
      totalProfit: 0,
      profitRate: 0,
      hasData: false,
      month,
      year,
    }
  }

  // 计算总收益
  const totalProfit = currentMonthProfits.reduce(
    (sum, p) => sum + p.calculatedProfit,
    0
  )

  // 计算加权平均收益率（按月初余额加权）
  const totalStartBalance = currentMonthProfits.reduce(
    (sum, p) => sum + p.startBalance,
    0
  )

  const weightedProfitRate = totalStartBalance > 0
    ? currentMonthProfits.reduce((sum, p) => {
        const weight = p.startBalance / totalStartBalance
        return sum + (p.profitRate || 0) * weight
      }, 0)
    : 0

  return {
    totalProfit,
    profitRate: weightedProfitRate,
    hasData: true,
    month,
    year,
  }
}

/**
 * 验证日期范围是否有效
 * 结束日期必须晚于或等于开始日期
 */
export function isValidDateRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): boolean {
  const start = new Date(startYear, startMonth - 1)
  const end = new Date(endYear, endMonth - 1)
  return end >= start
}

/**
 * 获取指定日期范围的收益汇总
 * @param transactions 所有交易
 * @param accounts 所有账户
 * @param startYear 起始年份
 * @param startMonth 起始月份
 * @param endYear 结束年份
 * @param endMonth 结束月份
 */
export function getDateRangeProfitSummary(
  transactions: Transaction[],
  accounts: Account[],
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): DateRangeProfitSummary {
  // 获取所有月度收益
  const allProfits = calculateMonthlyProfits(transactions, accounts)

  // 按日期范围过滤
  const filteredProfits = allProfits.filter((profit) => {
    const profitDate = new Date(profit.year, profit.month - 1)
    const startDate = new Date(startYear, startMonth - 1)
    const endDate = new Date(endYear, endMonth - 1)
    return profitDate >= startDate && profitDate <= endDate
  })

  // 按月份聚合（多账户求和）
  const monthlyAggregated = new Map<string, MonthlyProfit>()
  filteredProfits.forEach((profit) => {
    const key = `${profit.year}-${profit.month}`
    if (!monthlyAggregated.has(key)) {
      monthlyAggregated.set(key, { ...profit })
    } else {
      // 多账户月份：累加收益
      const existing = monthlyAggregated.get(key)!
      existing.calculatedProfit += profit.calculatedProfit
      existing.profitRate = profit.profitRate // 使用加权平均
    }
  })

  const monthlyData = Array.from(monthlyAggregated.values())

  if (monthlyData.length === 0) {
    return {
      totalProfit: 0,
      averageProfitRate: 0,
      monthCount: 0,
      startYear,
      startMonth,
      endYear,
      endMonth,
      monthlyData: [],
      hasData: false,
    }
  }

  // 计算总收益
  const totalProfit = monthlyData.reduce((sum, m) => sum + m.calculatedProfit, 0)

  // 计算加权平均收益率
  const totalStartBalance = monthlyData.reduce((sum, m) => sum + m.startBalance, 0)
  const averageProfitRate = totalStartBalance > 0
    ? monthlyData.reduce((sum, m) => {
        const weight = m.startBalance / totalStartBalance
        return sum + (m.profitRate || 0) * weight
      }, 0)
    : 0

  // 找出最佳和最差月份
  const sortedByProfit = [...monthlyData].sort((a, b) => b.calculatedProfit - a.calculatedProfit)
  const bestMonth = sortedByProfit[0]
  const worstMonth = sortedByProfit[sortedByProfit.length - 1]

  return {
    totalProfit,
    averageProfitRate,
    monthCount: monthlyData.length,
    startYear,
    startMonth,
    endYear,
    endMonth,
    bestMonth: {
      year: bestMonth.year,
      month: bestMonth.month,
      profit: bestMonth.calculatedProfit,
      accountName: bestMonth.accountName,
    },
    worstMonth: {
      year: worstMonth.year,
      month: worstMonth.month,
      profit: worstMonth.calculatedProfit,
      accountName: worstMonth.accountName,
    },
    monthlyData,
    hasData: true,
  }
}

/**
 * 查找账户的最新月末快照
 * @param transactions - 所有交易
 * @param accountId - 账户ID
 * @returns 最新的月末快照，如果没有则返回 null
 */
export function findLatestMonthEndSnapshot(
  transactions: Transaction[],
  accountId: string
): Transaction | null {
  const accountSnapshots = transactions.filter(
    (txn) =>
      txn.accountId === accountId &&
      txn.type === TransactionType.SNAPSHOT &&
      (txn.tags?.includes('month-end') ?? false)
  )

  if (accountSnapshots.length === 0) {
    return null
  }

  // 按创建时间降序排序，返回最新的
  return accountSnapshots.sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
    return dateB.getTime() - dateA.getTime()
  })[0]
}

/**
 * 从最新月末快照更新账户余额
 * @param transactions - 所有交易
 * @param accountId - 账户ID
 * @param currentBalance - 当前余额
 * @param account - 可选的账户对象（用于无快照时重算）
 * @returns 新余额（来自快照）或当前余额（无快照时）
 */
export function updateAccountBalanceFromSnapshot(
  transactions: Transaction[],
  accountId: string,
  currentBalance: number,
  account?: Account
): number {
  // 检查是否有到期转出交易（针对定期存款）
  const hasMaturityTransferOut = transactions.some(txn =>
    txn.accountId === accountId &&
    txn.tags?.includes('到期转出')
  )

  // 如果有到期转出交易，直接返回0（定期存款已全部转出）
  if (hasMaturityTransferOut) {
    console.log(`[余额更新] ${account?.name || accountId} - 检测到到期转出交易，余额设为0`)
    return 0
  }

  const latestSnapshot = findLatestMonthEndSnapshot(transactions, accountId)

  if (latestSnapshot && latestSnapshot.balance !== undefined) {
    // 有月末快照：使用快照余额
    return latestSnapshot.balance
  }

  // 无月末快照：基于交易历史重新计算
  if (account) {
    return calculateBalanceFromHistory(account, transactions)
  }

  // 回退：返回当前余额（如果 account 未提供）
  return currentBalance
}

/**
 * 从最新月末快照更新所有账户余额
 * @param transactions - 所有交易
 * @param accounts - 所有账户
 * @returns 需要更新的账户余额映射 (accountId -> newBalance)
 */
export function updateAllAccountsFromSnapshots(
  transactions: Transaction[],
  accounts: Account[]
): Map<string, number> {
  const updates = new Map<string, number>()

  accounts.forEach((account) => {
    // 传递 account 对象以访问 initialBalance
    const newBalance = updateAccountBalanceFromSnapshot(
      transactions,
      account.id,
      account.balance,
      account  // 传递整个账户对象
    )

    // 只记录需要更新的账户
    if (newBalance !== account.balance) {
      updates.set(account.id, newBalance)
    }
  })

  return updates
}

/**
 * 从初始余额和交易历史重新计算账户余额
 * @param account - 账户对象（包含 initialBalance）
 * @param transactions - 所有交易
 * @returns 计算出的余额
 */
export function calculateBalanceFromHistory(
  account: Account,
  transactions: Transaction[]
): number {
  // 从初始余额开始
  let calculatedBalance = account.initialBalance

  // 筛选该账户的所有交易
  const accountTransactions = transactions.filter(
    (txn) => txn.accountId === account.id
  )

  // 计算总收入
  const totalIncome = accountTransactions
    .filter(
      (txn) =>
        txn.type === TransactionType.INCOME ||
        txn.type === TransactionType.DEPOSIT ||
        txn.type === TransactionType.TRANSFER_IN
    )
    .reduce((sum, txn) => sum + (txn.amount || 0), 0)

  // 计算总支出
  const totalExpense = accountTransactions
    .filter(
      (txn) =>
        txn.type === TransactionType.CONSUMPTION ||
        txn.type === TransactionType.TRANSFER_OUT ||
        txn.type === TransactionType.LOAN
    )
    .reduce((sum, txn) => sum + (txn.amount || 0), 0)

  // 最终余额 = 初始余额 + 收入 - 支出
  calculatedBalance = calculatedBalance + totalIncome - totalExpense

  return calculatedBalance
}
