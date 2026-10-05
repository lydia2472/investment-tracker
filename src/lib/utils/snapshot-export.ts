import { format } from 'date-fns'

import type { Snapshot } from '@/lib/stores/snapshot-store'
import type { Account } from '@/types'

function escapeCSV(value: string | undefined | null): string {
  if (value === undefined || value === null) {
    return ''
  }

  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

function formatDate(date: Date | string): string {
  const parsedDate = date instanceof Date ? date : new Date(date)
  return format(parsedDate, 'yyyy-MM-dd HH:mm:ss')
}

function toSerializableSnapshot(snapshot: Snapshot, accountMap: Map<string, Account>) {
  const account = accountMap.get(snapshot.accountId)

  return {
    ...snapshot,
    accountName: account?.name || '',
    accountCurrency: account?.currency || '',
    snapshotDate:
      snapshot.snapshotDate instanceof Date
        ? snapshot.snapshotDate.toISOString()
        : snapshot.snapshotDate,
    createdAt:
      snapshot.createdAt instanceof Date ? snapshot.createdAt.toISOString() : snapshot.createdAt,
    updatedAt:
      snapshot.updatedAt instanceof Date ? snapshot.updatedAt.toISOString() : snapshot.updatedAt,
  }
}

export function exportSnapshotsToJSON(snapshots: Snapshot[], accounts: Account[]): string {
  const accountMap = new Map(accounts.map((account) => [account.id, account]))
  const data = snapshots.map((snapshot) => toSerializableSnapshot(snapshot, accountMap))

  return JSON.stringify(data, null, 2)
}

export function exportSnapshotsToCSV(snapshots: Snapshot[], accounts: Account[]): string {
  const accountMap = new Map(accounts.map((account) => [account.id, account]))
  const headers = [
    'ID',
    '账户名称',
    '账户ID',
    '货币',
    '快照日期',
    '快照金额',
    '投资金额',
    '黄金市场均价',
    '黄金累计克数',
    '备注',
    '创建时间',
    '更新时间',
  ]

  const rows = snapshots.map((snapshot) => {
    const account = accountMap.get(snapshot.accountId)

    return [
      snapshot.id,
      escapeCSV(account?.name || ''),
      snapshot.accountId,
      account?.currency || '',
      formatDate(snapshot.snapshotDate),
      snapshot.balance,
      snapshot.investmentAmount ?? '',
      snapshot.goldMarketPrice ?? '',
      snapshot.goldGrams ?? '',
      escapeCSV(snapshot.note ?? ''),
      formatDate(snapshot.createdAt),
      formatDate(snapshot.updatedAt),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

export function generateSnapshotExportFilename(format: 'json' | 'csv' = 'json'): string {
  const date = new Date().toISOString().split('T')[0]
  return `snapshots-${date}.${format}`
}

export function downloadSnapshotFile(
  content: string,
  filename: string,
  mimeType: string = 'application/json'
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadSnapshots(
  snapshots: Snapshot[],
  accounts: Account[],
  format: 'json' | 'csv' = 'json'
): void {
  const filename = generateSnapshotExportFilename(format)

  if (format === 'json') {
    const content = exportSnapshotsToJSON(snapshots, accounts)
    downloadSnapshotFile(content, filename, 'application/json')
    return
  }

  const content = exportSnapshotsToCSV(snapshots, accounts)
  downloadSnapshotFile(content, filename, 'text/csv')
}
