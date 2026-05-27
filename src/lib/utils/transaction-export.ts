import { Transaction, Account, TransactionType } from '@/types'
import { format } from 'date-fns'

/**
 * 将交易数据导出为 JSON 格式（包含账户名称）
 */
export function exportTransactionsToJSON(
  transactions: Transaction[],
  accounts: Account[]
): string {
  // 创建账户ID到名称的映射
  const accountMap = new Map(accounts.map(acc => [acc.id, acc.name]))

  const data = transactions.map(txn => {
    // 解构并排除 balance 字段
    const { balance, ...txnWithoutBalance } = txn

    return {
      ...txnWithoutBalance,
      // 添加账户名称
      accountName: accountMap.get(txn.accountId) || '',
      // 添加转账相关账户名称
      transferToAccountName: txn.transferToAccountId
        ? (accountMap.get(txn.transferToAccountId) || '')
        : '',
      transferFromAccountName: txn.transferFromAccountId
        ? (accountMap.get(txn.transferFromAccountId) || '')
        : '',
      // 日期格式化
      createdAt: txn.createdAt instanceof Date
        ? txn.createdAt.toISOString()
        : txn.createdAt,
      updatedAt: txn.updatedAt instanceof Date
        ? txn.updatedAt.toISOString()
        : txn.updatedAt,
    }
  })
  return JSON.stringify(data, null, 2)
}

/**
 * 将交易数据导出为 CSV 格式（包含账户名称）
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  accounts: Account[]
): string {
  // 创建账户ID到名称的映射
  const accountMap = new Map(accounts.map(acc => [acc.id, acc.name]))

  // CSV 表头
  const headers = [
    'ID',
    '账户名称',
    '账户ID',
    '交易类型',
    '金额',
    '转账目标账户名称',
    '转账来源账户名称',
    '转账配对ID',
    '描述',
    '备注',
    '标签',
    '创建时间',
    '更新时间'
  ]

  // 将交易数据转换为 CSV 行
  const rows = transactions.map(txn => {
    const formatDate = (date: Date | string) => {
      const d = date instanceof Date ? date : new Date(date)
      return format(d, 'yyyy-MM-dd HH:mm:ss')
    }

    const escapeCSV = (value: string | undefined | null): string => {
      if (value === undefined || value === null) return ''
      // 如果包含逗号、引号或换行符，用引号包裹并转义引号
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    // 根据交易类型计算显示金额
    let displayAmount: string | number

    if (txn.type === TransactionType.SNAPSHOT) {
      // Snapshot 使用 balance 字段
      displayAmount = txn.balance ?? ''
    } else {
      // 判断是否为支出类交易
      const isExpense =
        txn.type === TransactionType.CONSUMPTION ||
        txn.type === TransactionType.TRANSFER_OUT ||
        txn.type === TransactionType.LOAN

      const amount = txn.amount ?? 0
      // 支出类显示为负数，收入类保持正数
      displayAmount = isExpense ? -Math.abs(amount) : amount
    }

    return [
      txn.id,
      accountMap.get(txn.accountId) || '',
      txn.accountId,
      txn.type,
      displayAmount,
      accountMap.get(txn.transferToAccountId || '') || '',
      accountMap.get(txn.transferFromAccountId || '') || '',
      txn.transferPairId ?? '',
      escapeCSV(txn.description ?? ''),
      escapeCSV(txn.note ?? ''),
      escapeCSV(txn.tags?.join('; ') ?? ''),
      formatDate(txn.createdAt),
      formatDate(txn.updatedAt)
    ].join(',')
  })

  // 组合表头和数据行
  return [headers.join(','), ...rows].join('\n')
}

/**
 * 生成导出文件名
 */
export function generateExportFilename(format: 'json' | 'csv' = 'json'): string {
  const date = new Date().toISOString().split('T')[0]
  return `transactions-${date}.${format}`
}

/**
 * 触发文件下载
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 导出交易数据并下载
 */
export function downloadTransactions(
  transactions: Transaction[],
  accounts: Account[],
  format: 'json' | 'csv' = 'json'
): void {
  const filename = generateExportFilename(format)

  if (format === 'json') {
    const content = exportTransactionsToJSON(transactions, accounts)
    downloadFile(content, filename, 'application/json')
  } else if (format === 'csv') {
    const content = exportTransactionsToCSV(transactions, accounts)
    downloadFile(content, filename, 'text/csv')
  }
}
