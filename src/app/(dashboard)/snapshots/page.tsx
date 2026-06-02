'use client'

import { Button } from 'animal-island-ui'
import { format, endOfMonth, startOfMonth, differenceInMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TrashIcon, CalendarIcon } from '@/lib/components/icon-adapter'
import { MonthlyDataService } from '@/lib/services/monthly-data-service'
import { useAccountStore } from '@/lib/stores'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import { SnapshotImportDialog } from '@/components/snapshots/snapshot-import-dialog'

export default function SnapshotsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const { snapshots, deleteSnapshot } = useSnapshotStore()

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
  const calculateChange = (snapshot: any, index: number, accountSnapshots: any[]) => {
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

  const handleDeleteSnapshot = (snapshotId: string, accountName: string) => {
    if (confirm(`确定要删除 ${accountName} 的这个快照吗？`)) {
      deleteSnapshot(snapshotId)
      toast.success('快照已删除')
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">月末快照</h1>
          <p className="text-muted-foreground mt-1">查看和管理所有账户的月末快照记录</p>
        </div>
        <SnapshotImportDialog
          onImportSuccess={() => {
            // 刷新页面或重新加载数据
            window.location.reload()
          }}
        />
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
                              onClick={() => handleDeleteSnapshot(snapshot.id, account.name)}
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
