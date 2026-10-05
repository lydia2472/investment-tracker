'use client'

import { Button } from 'animal-island-ui'
import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DownloadIcon } from '@/lib/components/icon-adapter'
import { downloadTransactions } from '@/lib/utils/transaction-export'

import { AccountType } from '@/types'
import type { Transaction, Account } from '@/types'

type ExportFormat = 'json' | 'csv'
type ExportScope = 'all' | 'filtered'

interface ExportDialogProps {
  transactions: Transaction[]
  accounts?: Account[]
  trigger?: React.ReactNode
  filteredTransactions?: Transaction[]
}

export function ExportDialog({
  transactions,
  accounts = [],
  filteredTransactions,
  trigger,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('json')
  const [scope, setScope] = useState<ExportScope>('all')

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // 黄金账户的交易（投资收益/亏损）是快照自动生成的派生数据，
      // 导出后再导入会重复或冲突，因此导出时排除黄金账户的所有交易。
      const goldAccountIds = new Set(
        accounts.filter((acc) => acc.type === AccountType.GOLD).map((acc) => acc.id)
      )
      const excludeGold = (txns: Transaction[]) =>
        goldAccountIds.size > 0
          ? txns.filter((t) => !goldAccountIds.has(t.accountId))
          : txns

      const rawData =
        scope === 'filtered' && filteredTransactions ? filteredTransactions : transactions
      const dataToExport = excludeGold(rawData)

      downloadTransactions(dataToExport, accounts, format)
      setOpen(false)
    } catch (error) {
      console.error('导出失败:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const hasFilteredData = filteredTransactions && filteredTransactions.length < transactions.length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="default" icon={<DownloadIcon className="h-4 w-4" />}>
            导出
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>导出交易数据</DialogTitle>
          <DialogDescription>选择导出格式、范围和统计口径说明</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">共 {transactions.length} 条交易记录</div>

          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-muted-foreground space-y-1">
            <div>收支统计口径只包含：收入、存款、消费、放贷。</div>
            <div>转入、转出、投资收益、投资亏损会原样导出，但会标记为“不计入收支”。</div>
          </div>

          {/* 格式选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">导出格式</label>
            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON 格式</SelectItem>
                <SelectItem value="csv">CSV 格式</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 范围选择 */}
          {hasFilteredData && (
            <div className="space-y-2">
              <label className="text-sm font-medium">数据范围</label>
              <Select value={scope} onValueChange={(value) => setScope(value as ExportScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有交易 ({transactions.length} 条)</SelectItem>
                  <SelectItem value="filtered">
                    筛选结果 ({filteredTransactions.length} 条)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 导出按钮 */}
          <Button onClick={handleExport} disabled={isExporting} className="w-full">
            {isExporting ? '导出中...' : `导出为 ${format.toUpperCase()}`}
          </Button>

          {/* 格式说明 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              • <strong>JSON</strong>：完整的交易数据，适合备份和数据迁移
            </div>
            <div>
              • <strong>CSV</strong>：表格格式，适合 Excel 和数据分析
            </div>
            <div>• 两种格式都会附带“收支统计归类 / 收益模块归类 / 统计口径说明”字段</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
