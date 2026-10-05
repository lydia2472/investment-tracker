import { parse, endOfDay, format } from 'date-fns'

import { splitCSVLines as splitCSVRecords } from '@/lib/utils/csv-parse'
import {
  isSnapshotSyncTransaction,
  SNAPSHOT_PROFIT_SYNC_TAG,
} from '@/lib/utils/snapshot-profit-sync'
import { calculateGoldSnapshotValue } from '@/lib/utils/gold-profit-helpers'
import { TransactionType, type Account, type Transaction } from '@/types'

import type { Snapshot } from '@/lib/stores/snapshot-store'

/**
 * 快照导入数据接口
 */
export interface SnapshotImportData {
  accountName: string
  date: Date
  snapshotBalance: number // 快照金额（月末余额）
  transferIn: number // 本月转入金额
  goldMarketPrice?: number // 黄金账户：当月市场均价
  goldGrams?: number // 黄金账户：当月累计克数
}

/**
 * 快照导入结果
 */
export interface SnapshotImportResult {
  total: number
  success: number // 成功创建的快照数
  profitCreated: number // 创建的收益交易数
  failed: number
  errors: Array<{
    index: number
    error: string
  }>
}

export interface SnapshotImportCleanupPlan {
  transactionIds: string[]
  snapshotIds: string[]
}

/**
 * 检测CSV分隔符
 */
function detectDelimiter(line: string): string {
  const delimiters = [';', '\t', ',']
  let maxCount = 0
  let detected = ','

  for (const delimiter of delimiters) {
    const count = (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length
    if (count > maxCount) {
      maxCount = count
      detected = delimiter
    }
  }

  return detected
}

/**
 * 解析快照导入CSV
 * 格式：账户名, 日期, 快照金额, 转入金额
 * 示例：招商银行, 2025-04-30, 10000, 5000
 */
export function parseSnapshotCSV(content: string): SnapshotImportData[] {
  // 引号感知的行拆分：避免引号字段内部的换行符被误判为记录分隔符
  const lines = splitCSVRecords(content)
  if (lines.length < 2) {
    throw new Error('CSV文件至少需要包含表头和一行数据')
  }

  // 检测分隔符
  const delimiter = detectDelimiter(lines[0])

  // 解析表头
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''))

  // 查找列索引
  const accountNameIndex = headers.findIndex(
    (h) =>
      h.toLowerCase() === 'accountname' ||
      h === '账户名称' ||
      h === '账户名' ||
      h.toLowerCase() === 'account' ||
      h === '名称' ||
      h === 'name'
  )

  const dateIndex = headers.findIndex(
    (h) =>
      h.toLowerCase() === 'date' ||
      h === '日期' ||
      h === '时间' ||
      h.toLowerCase() === 'datetime' ||
      h === '快照日期'
  )

  const snapshotBalanceIndex = headers.findIndex(
    (h) =>
      h.toLowerCase() === 'snapshotbalance' ||
      h === '快照金额' ||
      h === '月末余额' ||
      h === '余额' ||
      h === 'balance' ||
      h === '快照'
  )

  const goldMarketPriceIndex = headers.findIndex(
    (h) =>
      h.toLowerCase() === 'goldmarketprice' ||
      h.toLowerCase() === 'goldprice' ||
      h === '黄金市场均价' ||
      h === '黄金均价' ||
      h === '市场均价' ||
      h === '均价'
  )

  const goldGramsIndex = headers.findIndex(
    (h) =>
      h.toLowerCase() === 'goldgrams' ||
      h.toLowerCase() === 'grams' ||
      h === '黄金累计克数' ||
      h === '累计克数' ||
      h === '克数'
  )

  const transferInIndex = headers.findIndex(
    (h) =>
      h.toLowerCase() === 'transferin' ||
      h === '转入' ||
      h === '转入金额' ||
      h === '本月转入' ||
      h === '投资金额' ||
      h === '投资' ||
      h === '投入' ||
      h === '投入金额' ||
      h === '本月投资' ||
      h === '本月投入' ||
      h === '本期投入' ||
      h === '本期投资' ||
      h === '新增投资' ||
      h === '本期转入' ||
      h.toLowerCase() === 'investment' ||
      h.toLowerCase() === 'invested' ||
      h.toLowerCase() === 'deposit' ||
      h === '存款'
  )

  if (accountNameIndex === -1) {
    throw new Error('缺少账户名称列，请确保CSV包含"账户名称"或"account"列')
  }

  if (dateIndex === -1) {
    throw new Error('缺少日期列，请确保CSV包含"日期"或"date"列')
  }

  if (snapshotBalanceIndex === -1 && (goldMarketPriceIndex === -1 || goldGramsIndex === -1)) {
    throw new Error('缺少快照金额列，请确保CSV包含"快照金额"或同时包含"黄金均价"和"累计克数"列')
  }

  // 解析数据行
  const results: SnapshotImportData[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // 处理带引号的字段
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    // 获取账户名
    const accountName = values[accountNameIndex]?.replace(/^["']|["']$/g, '') || ''
    if (!accountName) {
      console.warn(`[快照导入] 第 ${i} 行：账户名称为空，跳过`)
      continue
    }

    // 解析日期
    const dateStr = values[dateIndex]?.replace(/^["']|["']$/g, '') || ''
    const date = parseDate(dateStr)
    if (!date) {
      console.warn(`[快照导入] 第 ${i} 行：日期格式无效 "${dateStr}"，跳过`)
      continue
    }

    // 解析快照金额
    const goldMarketPriceStr =
      goldMarketPriceIndex !== -1
        ? values[goldMarketPriceIndex]?.replace(/^["']|["']$/g, '') || ''
        : ''
    const goldGramsStr =
      goldGramsIndex !== -1 ? values[goldGramsIndex]?.replace(/^["']|["']$/g, '') || '' : ''
    const goldMarketPrice = parseFloat(goldMarketPriceStr.replace(/,/g, ''))
    const goldGrams = parseFloat(goldGramsStr.replace(/,/g, ''))
    const hasGoldData = !isNaN(goldMarketPrice) && !isNaN(goldGrams)

    const snapshotBalanceStr =
      snapshotBalanceIndex !== -1
        ? values[snapshotBalanceIndex]?.replace(/^["']|["']$/g, '') || ''
        : ''
    const parsedSnapshotBalance = parseFloat(snapshotBalanceStr.replace(/,/g, ''))
    const snapshotBalance = hasGoldData
      ? calculateGoldSnapshotValue(goldMarketPrice, goldGrams)
      : parsedSnapshotBalance

    if (isNaN(snapshotBalance)) {
      console.warn(`[快照导入] 第 ${i} 行：快照金额无效 "${snapshotBalanceStr}"，跳过`)
      continue
    }

    // 解析转入金额（可选）
    const transferInStr =
      transferInIndex !== -1 ? values[transferInIndex]?.replace(/^["']|["']$/g, '') || '0' : '0'
    const transferIn = parseFloat(transferInStr.replace(/,/g, ''))
    const finalTransferIn = isNaN(transferIn) ? 0 : transferIn

    results.push({
      accountName,
      date: endOfDay(date), // 设置为月末的最后时刻
      snapshotBalance,
      transferIn: finalTransferIn,
      goldMarketPrice: hasGoldData ? goldMarketPrice : undefined,
      goldGrams: hasGoldData ? goldGrams : undefined,
    })

    console.log(
      `[快照导入] 第 ${i} 行：${accountName} ${format(date, 'yyyy-MM-dd')} 快照=${snapshotBalance} 转入=${finalTransferIn}`
    )
  }

  return results
}

/**
 * 解析日期字符串
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  const formats = [
    'yyyy-MM-dd HH:mm:ss',
    'yyyy/M/d H:mm:ss',
    'yyyy-MM-dd HH:mm',
    'yyyy/M/d H:mm',
    'yyyy-MM-dd',
    'yyyy/M/d',
    'yyyy-MM',
    'yyyy/MM',
  ]

  for (const fmt of formats) {
    const date = parse(dateStr, fmt, new Date())
    if (isValid(date)) {
      return date
    }
  }

  return null
}

/**
 * 检查日期是否有效
 */
function isValid(date: Date): boolean {
  return !isNaN(date.getTime())
}

export function createSnapshotImportCleanupPlan(
  importData: SnapshotImportData[],
  accounts: Pick<Account, 'id' | 'name'>[],
  existingTransactions: Transaction[],
  existingSnapshots: Snapshot[]
): SnapshotImportCleanupPlan {
  const accountMap = new Map(accounts.map((account) => [account.name.toLowerCase(), account.id]))
  const importedMonths = new Set<string>()

  importData.forEach((data) => {
    const accountId = accountMap.get(data.accountName.toLowerCase())
    if (!accountId) {
      return
    }

    importedMonths.add(`${accountId}:${data.date.getFullYear()}:${data.date.getMonth()}`)
  })

  const transactionIds = new Set<string>()
  const snapshotIds = new Set<string>()

  existingTransactions.forEach((transaction) => {
    if (!isSnapshotSyncTransaction(transaction)) {
      return
    }

    const transactionDate =
      transaction.createdAt instanceof Date
        ? transaction.createdAt
        : new Date(transaction.createdAt)
    const monthKey = `${transaction.accountId}:${transactionDate.getFullYear()}:${transactionDate.getMonth()}`

    if (importedMonths.has(monthKey)) {
      transactionIds.add(transaction.id)
    }
  })

  existingSnapshots.forEach((snapshot) => {
    const snapshotDate =
      snapshot.snapshotDate instanceof Date
        ? snapshot.snapshotDate
        : new Date(snapshot.snapshotDate)
    const monthKey = `${snapshot.accountId}:${snapshotDate.getFullYear()}:${snapshotDate.getMonth()}`

    if (importedMonths.has(monthKey)) {
      snapshotIds.add(snapshot.id)
    }
  })

  return {
    transactionIds: Array.from(transactionIds),
    snapshotIds: Array.from(snapshotIds),
  }
}

/**
 * 导入快照并创建收益交易
 */
export function importSnapshotsAndCreateProfits(
  importData: SnapshotImportData[],
  accounts: { id: string; name: string }[],
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void,
  addSnapshot: (snapshot: {
    accountId: string
    balance: number
    snapshotDate: Date
    investmentAmount?: number
    goldMarketPrice?: number
    goldGrams?: number
    note?: string
  }) => void
): SnapshotImportResult {
  const result: SnapshotImportResult = {
    total: importData.length,
    success: 0,
    profitCreated: 0,
    failed: 0,
    errors: [],
  }

  // 创建账户名到ID的映射
  const accountMap = new Map<string, string>()
  accounts.forEach((acc) => {
    accountMap.set(acc.name.toLowerCase(), acc.id)
  })

  // 按账户分组快照数据
  const snapshotsByAccount = new Map<string, SnapshotImportData[]>()
  importData.forEach((data, index) => {
    const accountId = accountMap.get(data.accountName.toLowerCase())
    if (!accountId) {
      result.errors.push({
        index,
        error: `账户 "${data.accountName}" 不存在`,
      })
      result.failed++
      return
    }

    if (!snapshotsByAccount.has(accountId)) {
      snapshotsByAccount.set(accountId, [])
    }
    snapshotsByAccount.get(accountId)!.push(data)
    result.success++
  })

  // 为每个账户创建快照和收益交易
  snapshotsByAccount.forEach((snapshots, accountId) => {
    // 按日期排序（升序：旧→新）
    const sortedSnapshots = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime())

    console.log(`\n[快照导入] 账户 ${accountId}，共 ${sortedSnapshots.length} 个月的数据`)

    // 创建快照
    sortedSnapshots.forEach((snapshotData) => {
      addSnapshot({
        accountId,
        balance: snapshotData.snapshotBalance,
        snapshotDate: snapshotData.date,
        investmentAmount: snapshotData.transferIn,
        goldMarketPrice: snapshotData.goldMarketPrice,
        goldGrams: snapshotData.goldGrams,
        note: '导入的快照',
      })

      console.log(
        `  创建快照: ${format(snapshotData.date, 'yyyy-MM-dd')} 余额=${snapshotData.snapshotBalance}`
      )
    })

    // 创建收益交易（需要至少2个快照）
    console.log(`  [调试] 准备计算收益，快照总数: ${sortedSnapshots.length}`)

    if (sortedSnapshots.length < 2) {
      console.log(`  [调试] 快照数量少于2个，跳过收益计算`)
    } else {
      for (let i = 1; i < sortedSnapshots.length; i++) {
        const current = sortedSnapshots[i]
        const previous = sortedSnapshots[i - 1]

        console.log(`  [调试] 计算第 ${i} 个月的收益:`)
        console.log(
          `    上月快照: ${format(previous.date, 'yyyy-MM-dd')} 余额=${previous.snapshotBalance}`
        )
        console.log(
          `    本月快照: ${format(current.date, 'yyyy-MM-dd')} 余额=${current.snapshotBalance}`
        )
        console.log(`    本月转入: ${current.transferIn}`)

        // 计算收益：本月快照 - 上月快照 - 本月转入
        const profit = current.snapshotBalance - previous.snapshotBalance - current.transferIn

        console.log(
          `    计算收益: ${current.snapshotBalance} - ${previous.snapshotBalance} - ${current.transferIn} = ${profit}`
        )

        if (profit === 0) {
          console.log(`    收益为0，跳过创建交易`)
          continue
        }

        // 确定交易类型
        const txnType =
          profit > 0 ? TransactionType.INVESTMENT_PROFIT : TransactionType.INVESTMENT_LOSS

        // 计算月份（使用本月快照的日期）
        const year = current.date.getFullYear()
        const month = current.date.getMonth() + 1

        // 创建收益交易
        const monthEnd = endOfDay(current.date)
        addTransaction({
          accountId,
          type: txnType,
          amount: Math.abs(profit),
          balance: current.snapshotBalance,
          description: `${year}年${month}月投资${profit > 0 ? '收益' : '亏损'}（导入自动生成）`,
          tags: ['投资收益', '导入生成', '快照生成', SNAPSHOT_PROFIT_SYNC_TAG],
          createdAt: monthEnd,
          updatedAt: monthEnd,
        })

        result.profitCreated++
        console.log(
          `    ✓ 创建收益交易: ${year}年${month}月 ${profit > 0 ? '收益' : '亏损'} = ${profit.toFixed(2)}元`
        )
      }
    }
  })

  console.log(
    `\n[快照导入] 完成：${result.success}个快照，${result.profitCreated}个收益交易，${result.failed}个失败`
  )

  return result
}
