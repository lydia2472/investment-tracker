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
import { downloadSnapshots } from '@/lib/utils/snapshot-export'

import type { Snapshot } from '@/lib/stores/snapshot-store'
import type { Account } from '@/types'

type ExportFormat = 'json' | 'csv'
type ExportScope = 'all' | 'filtered'

interface SnapshotExportDialogProps {
  snapshots: Snapshot[]
  filteredSnapshots?: Snapshot[]
  accounts: Account[]
  trigger?: React.ReactNode
}

export function SnapshotExportDialog({
  snapshots,
  filteredSnapshots,
  accounts,
  trigger,
}: SnapshotExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [scope, setScope] = useState<ExportScope>('all')

  const hasFilteredData =
    !!filteredSnapshots &&
    filteredSnapshots.length > 0 &&
    filteredSnapshots.length < snapshots.length

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const dataToExport =
        scope === 'filtered' && filteredSnapshots ? filteredSnapshots : snapshots

      downloadSnapshots(dataToExport, accounts, format)
      setOpen(false)
    } catch (error) {
      console.error('导出快照失败:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="default" icon={<DownloadIcon className="h-4 w-4" />}>
            导出快照
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>导出快照金额</DialogTitle>
          <DialogDescription>导出月末快照金额、投资金额与备注信息</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">共 {snapshots.length} 个快照记录</div>

          <div className="space-y-2">
            <label className="text-sm font-medium">导出格式</label>
            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV 格式</SelectItem>
                <SelectItem value="json">JSON 格式</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilteredData && (
            <div className="space-y-2">
              <label className="text-sm font-medium">数据范围</label>
              <Select value={scope} onValueChange={(value) => setScope(value as ExportScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有快照 ({snapshots.length} 条)</SelectItem>
                  <SelectItem value="filtered">
                    当前筛选结果 ({filteredSnapshots.length} 条)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handleExport} disabled={isExporting} className="w-full">
            {isExporting ? '导出中...' : `导出为 ${format.toUpperCase()}`}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              • <strong>CSV</strong>：适合 Excel 查看快照金额和投资金额
            </div>
            <div>
              • <strong>JSON</strong>：适合备份完整快照记录
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
