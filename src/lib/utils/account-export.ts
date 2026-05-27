import { Account } from '@/types'
import { format } from 'date-fns'

/**
 * 将账户数据导出为 JSON 格式
 */
export function exportAccountsToJSON(accounts: Account[]): string {
  const data = accounts.map(acc => ({
    ...acc,
    createdAt: acc.createdAt instanceof Date
      ? acc.createdAt.toISOString()
      : acc.createdAt,
    updatedAt: acc.updatedAt instanceof Date
      ? acc.updatedAt.toISOString()
      : acc.updatedAt,
  }))
  return JSON.stringify(data, null, 2)
}

/**
 * 将账户数据导出为 CSV 格式
 */
export function exportAccountsToCSV(accounts: Account[]): string {
  const headers = [
    'ID',
    '账户名称',
    '账户类型',
    '当前余额',
    '初始余额',
    '货币',
    '描述',
    '主题色',
    '图标',
    '创建时间',
    '更新时间'
  ]

  const rows = accounts.map(acc => {
    const formatDate = (date: Date | string) => {
      const d = date instanceof Date ? date : new Date(date)
      return format(d, 'yyyy-MM-dd HH:mm:ss')
    }

    const escapeCSV = (value: string | undefined | null): string => {
      if (value === undefined || value === null) return ''
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    return [
      acc.id,
      acc.name,
      acc.type,
      acc.balance,
      acc.initialBalance,
      acc.currency,
      escapeCSV(acc.description),
      escapeCSV(acc.color),
      escapeCSV(acc.icon),
      formatDate(acc.createdAt),
      formatDate(acc.updatedAt)
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

/**
 * 生成导出文件名
 */
export function generateAccountExportFilename(format: 'json' | 'csv' = 'json'): string {
  const date = new Date().toISOString().split('T')[0]
  return `accounts-${date}.${format}`
}

/**
 * 触发文件下载
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 导出账户数据并下载
 */
export function downloadAccounts(accounts: Account[], format: 'json' | 'csv' = 'json'): void {
  const filename = generateAccountExportFilename(format)

  if (format === 'json') {
    const content = exportAccountsToJSON(accounts)
    downloadFile(content, filename, 'application/json')
  } else if (format === 'csv') {
    const content = exportAccountsToCSV(accounts)
    downloadFile(content, filename, 'text/csv')
  }
}
