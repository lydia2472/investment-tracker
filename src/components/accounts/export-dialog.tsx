'use client'

import { useState } from 'react'
import { DownloadIcon } from '@/lib/components/icon-adapter'
import { Button } from 'animal-island-ui'
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
import { downloadAccounts } from '@/lib/utils/account-export'
import type { Account } from '@/types'

type ExportFormat = 'json' | 'csv'

interface ExportDialogProps {
  accounts: Account[]
  trigger?: React.ReactNode
}

export function ExportDialog({
  accounts,
  trigger
}: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('json')

  const handleExport = async () => {
    setIsExporting(true)
    try {
      downloadAccounts(accounts, format)
      setOpen(false)
    } catch (error) {
      console.error('导出失败:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="default"
            icon={<DownloadIcon className="h-4 w-4" />}
          >
            导出
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>导出账户数据</DialogTitle>
          <DialogDescription>
            选择导出格式
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            共 {accounts.length} 个账户
          </div>

          {/* 格式选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">导出格式</label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON 格式</SelectItem>
                <SelectItem value="csv">CSV 格式</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 导出按钮 */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? '导出中...' : `导出为 ${format.toUpperCase()}`}
          </Button>

          {/* 格式说明 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• <strong>JSON</strong>：完整的账户数据，适合备份和数据迁移</div>
            <div>• <strong>CSV</strong>：表格格式，适合 Excel 和数据分析</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
