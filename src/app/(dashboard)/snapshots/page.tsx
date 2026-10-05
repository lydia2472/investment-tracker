'use client'

import { Button } from 'animal-island-ui'
import { format } from 'date-fns'
import { useState } from 'react'
import { toast } from 'sonner'

import { SnapshotExportDialog } from '@/components/snapshots/export-dialog'
import { LegacyMonthlyDataRepairDialog } from '@/components/snapshots/legacy-monthly-data-repair-dialog'
import { SnapshotImportDialog } from '@/components/snapshots/snapshot-import-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, DownloadIcon, TrashIcon, UploadIcon } from '@/lib/components/icon-adapter'
import { useAccountStore } from '@/lib/stores'
import { useTransactionStore } from '@/lib/stores/transaction-store'
import { useSnapshotStore, type Snapshot } from '@/lib/stores/snapshot-store'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'

export default function SnapshotsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)
  const { snapshots, deleteSnapshotsForAccountMonth } = useSnapshotStore()

  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  // 过滤快照
  const filteredSnapshots = snapshots.filter((snapshot) => {
    // 账户筛选
    if (selectedAccountId !== 'all' && snapshot.accountId !== selectedAccountId) {
      return false
    }

    // 月份筛选
    if (selectedMonth !== 'all') {
      const snapshotMonth = format(new Date(snapshot.snapshotDate), 'yyyy-MM')
      if (snapshotMonth !== selectedMonth) {
        return false
      }
    }

    return true
  })

  // 按账户分组
  const snapshotsByAccount = accounts
    .filter((account) => filteredSnapshots.some((s) => s.accountId === account.id))
    .map((account) => ({
      account,
      snapshots: filteredSnapshots
        .filter((s) => s.accountId === account.id)
        .sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()),
    }))
    .filter((group) => group.snapshots.length > 0)

  // 计算相比上月的收益变化
  const calculateChange = (snapshot: Snapshot, index: number, accountSnapshots: Snapshot[]) => {
    if (index < accountSnapshots.length - 1) {
      const nextSnapshot = accountSnapshots[index + 1]
      const change = snapshot.balance - nextSnapshot.balance
      return change
    }
    return null
  }

  // 获取可用的月份列表
  const getAvailableMonths = () => {
    const months = new Set<string>()
    snapshots.forEach((snapshot) => {
      months.add(format(new Date(snapshot.snapshotDate), 'yyyy-MM'))
    })
    return Array.from(months).sort().reverse()
  }

  const handleDeleteSnapshot = (snapshot: Snapshot, accountName: string) => {
    const snapshotDate = new Date(snapshot.snapshotDate)
    const sameMonthCount = snapshots.filter((item) => {
      if (item.accountId !== snapshot.accountId) {
        return false
      }

      const itemDate = new Date(item.snapshotDate)
      return (
        itemDate.getFullYear() === snapshotDate.getFullYear() &&
        itemDate.getMonth() === snapshotDate.getMonth()
      )
    }).length

    const monthLabel = format(snapshotDate, 'yyyy年MM月')
    const message =
      sameMonthCount > 1
        ? `检测到 ${accountName} 在 ${monthLabel} 有 ${sameMonthCount} 条快照，确定要整月删除吗？`
        : `确定要删除 ${accountName} 在 ${monthLabel} 的快照吗？`

    if (confirm(message)) {
      const deletedCount = deleteSnapshotsForAccountMonth(snapshot.accountId, snapshotDate)
      toast.success(
        deletedCount > 1 ? `已删除 ${monthLabel} 的 ${deletedCount} 条快照` : '快照已删除'
      )
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">月末快照</h1>
          <p className="text-muted-foreground mt-1">查看和管理所有账户的月末快照记录</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SnapshotExportDialog
            snapshots={snapshots}
            filteredSnapshots={filteredSnapshots}
            accounts={accounts}
            trigger={
              <Button
                type="primary"
                className="bg-[#2563eb] hover:bg-[#1d4ed8]"
                icon={<DownloadIcon className="h-4 w-4" />}
              >
                导出快照金额
              </Button>
            }
          />
          <SnapshotImportDialog
            trigger={
              <Button
                type="default"
                className="border border-[#16a34a] text-[#166534]"
                icon={<UploadIcon className="h-4 w-4" />}
              >
                导入快照
              </Button>
            }
          />
          <LegacyMonthlyDataRepairDialog
            accounts={accounts}
            snapshots={snapshots}
            transactions={transactions}
          />
        </div>
      </div>

      {/* 筛选器 */}
      <div className="flex gap-4 items-center bg-muted/50 p-4 rounded-xl">
        {/* 账户筛选 */}
        <div className="flex-1">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="所有账户" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有账户</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 月份筛选 */}
        <div className="flex-1">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="所有月份" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有月份</SelectItem>
              {getAvailableMonths().map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 统计信息 */}
        <div className="text-sm text-muted-foreground">共 {filteredSnapshots.length} 个快照</div>
      </div>

      {/* 快照列表 */}
      {snapshotsByAccount.length === 0 ? (
        <div className="text-center py-12">
          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">暂无快照记录</h3>
          <p className="text-muted-foreground">
            {selectedAccountId !== 'all' || selectedMonth !== 'all'
              ? '当前筛选条件下没有快照记录'
              : '还没有月末快照，可以通过「添加交易」对话框中的「月末数据」模式来记录'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {snapshotsByAccount.map(({ account, snapshots: accountSnapshots }) => (
            <div key={account.id} className="bg-background border rounded-xl overflow-hidden">
              {/* 账户头部 */}
              <div className="bg-muted/50 px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: account.color }}
                  >
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{account.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {accountSnapshots.length} 个快照
                    </p>
                  </div>
                </div>
              </div>

              {/* 快照表格 */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                        快照日期
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                        快照金额
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                        投资金额
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                        相比上月
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                        备注
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-medium text-muted-foreground">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountSnapshots.map((snapshot, index) => {
                      const change = calculateChange(snapshot, index, accountSnapshots)
                      return (
                        <tr
                          key={snapshot.id}
                          className="border-b last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="px-6 py-4 text-sm">
                            {format(new Date(snapshot.snapshotDate), 'yyyy年MM月dd日')}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-medium">
                            {formatCurrency(snapshot.balance)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right">
                            {snapshot.investmentAmount ? (
                              <span className="text-blue-600">
                                {formatCurrency(snapshot.investmentAmount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-right">
                            {change !== null ? (
                              <span
                                className={cn(
                                  'font-medium',
                                  change > 0
                                    ? 'text-green-600'
                                    : change < 0
                                      ? 'text-red-600'
                                      : 'text-muted-foreground'
                                )}
                              >
                                {change > 0 ? '+' : ''}
                                {formatCurrency(change)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-muted-foreground max-w-xs truncate">
                            {snapshot.note || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <Button
                              type="default"
                              size="small"
                              onClick={() => handleDeleteSnapshot(snapshot, account.name)}
                              icon={<TrashIcon className="h-4 w-4" />}
                            >
                              删除
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
