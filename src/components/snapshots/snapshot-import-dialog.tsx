'use client'

import { Button } from 'animal-island-ui'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UploadIcon } from '@/lib/components/icon-adapter'
import { useAccountStore, useTransactionStore, useSnapshotStore } from '@/lib/stores'
import {
  createSnapshotImportCleanupPlan,
  parseSnapshotCSV,
  importSnapshotsAndCreateProfits,
  type SnapshotImportResult,
} from '@/lib/utils/snapshot-import'
import { createSnapshotProfitSyncPlan } from '@/lib/utils/snapshot-profit-sync'

interface SnapshotImportDialogProps {
  trigger?: React.ReactNode
  onImportSuccess?: () => void
}

export function SnapshotImportDialog({ trigger, onImportSuccess }: SnapshotImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResult, setImportResult] = useState<SnapshotImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const accounts = useAccountStore((state) => state.accounts)
  const addTransaction = useTransactionStore((state) => state.addTransaction)
  const updateTransaction = useTransactionStore((state) => state.updateTransaction)
  const deleteMultiple = useTransactionStore((state) => state.deleteMultiple)
  const { addSnapshot, deleteSnapshot } = useSnapshotStore()

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportResult(null)
    }
  }, [])

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      toast.error('请选择要导入的文件')
      return
    }

    setIsProcessing(true)
    try {
      // 读取文件内容
      const content = await selectedFile.text()

      // 解析CSV
      let importData
      try {
        importData = parseSnapshotCSV(content)
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'CSV解析失败')
      }

      if (importData.length === 0) {
        throw new Error('CSV文件中没有有效数据')
      }

      const cleanupPlan = createSnapshotImportCleanupPlan(
        importData,
        accounts,
        useTransactionStore.getState().transactions,
        useSnapshotStore.getState().snapshots
      )

      if (cleanupPlan.transactionIds.length > 0) {
        deleteMultiple(cleanupPlan.transactionIds)
      }

      if (cleanupPlan.snapshotIds.length > 0) {
        cleanupPlan.snapshotIds.forEach((snapshotId) => {
          deleteSnapshot(snapshotId)
        })
      }

      // 导入快照并创建收益交易
      const accountList = accounts.map((acc) => ({ id: acc.id, name: acc.name }))
      const importResult = importSnapshotsAndCreateProfits(
        importData,
        accountList,
        addTransaction,
        addSnapshot
      )

      const snapshotProfitSyncPlan = createSnapshotProfitSyncPlan(
        useAccountStore.getState().accounts,
        useSnapshotStore.getState().snapshots,
        useTransactionStore.getState().transactions
      )

      if (snapshotProfitSyncPlan.deleteIds.length > 0) {
        deleteMultiple(snapshotProfitSyncPlan.deleteIds)
      }

      snapshotProfitSyncPlan.update.forEach(({ id, updates }) => {
        updateTransaction(id, updates)
      })

      snapshotProfitSyncPlan.create.forEach((transaction) => {
        addTransaction(transaction)
      })

      const result: SnapshotImportResult = {
        ...importResult,
        profitCreated: importResult.profitCreated + snapshotProfitSyncPlan.create.length,
      }

      setImportResult(result)

      // 显示成功提示
      if (result.success > 0) {
        toast.success('导入成功', {
          description:
            `创建了 ${result.success} 个快照，${result.profitCreated} 个收益交易` +
            `${snapshotProfitSyncPlan.update.length > 0 || snapshotProfitSyncPlan.deleteIds.length > 0
              ? `（同步更新 ${snapshotProfitSyncPlan.update.length} 个，删除 ${snapshotProfitSyncPlan.deleteIds.length} 个）`
              : ''}` +
            `${cleanupPlan.snapshotIds.length > 0 || cleanupPlan.transactionIds.length > 0
              ? `，覆盖了 ${cleanupPlan.snapshotIds.length} 个旧快照和 ${cleanupPlan.transactionIds.length} 条旧交易`
              : ''}` +
            `${result.failed > 0 ? `，${result.failed} 个失败` : ''}`,
        })

        if (onImportSuccess) {
          onImportSuccess()
        }

        // 延迟关闭对话框
        setTimeout(() => {
          setOpen(false)
          setSelectedFile(null)
          setImportResult(null)
        }, 2000)
      } else {
        toast.error('导入失败', {
          description: '所有记录都存在验证错误',
        })
      }
    } catch (error) {
      console.error('导入失败:', error)
      toast.error('导入失败', {
        description: error instanceof Error ? error.message : '未知错误',
      })
    } finally {
      setIsProcessing(false)
    }
  }, [
    selectedFile,
    accounts,
    addTransaction,
    updateTransaction,
    addSnapshot,
    deleteMultiple,
    deleteSnapshot,
    onImportSuccess,
  ])

  const handleReset = () => {
    setSelectedFile(null)
    setImportResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="default" icon={<UploadIcon className="h-4 w-4" />}>
            导入快照
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入快照和收益数据</DialogTitle>
          <DialogDescription>
            导入每月快照数据，自动计算并创建收益交易记录
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 文件选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">选择CSV文件</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/80"
            />
            {selectedFile && (
              <div className="text-sm text-muted-foreground">已选择: {selectedFile.name}</div>
            )}
          </div>

          {/* 导入结果 */}
          {importResult && (
            <div className="space-y-3">
              <div className="flex gap-2 text-sm">
                <div className="flex-1">
                  <span className="font-medium">总计:</span> {importResult.total} 行
                </div>
                <div className="flex-1 text-green-600">
                  <span className="font-medium">快照:</span> {importResult.success} 个
                </div>
                <div className="flex-1 text-blue-600">
                  <span className="font-medium">收益交易:</span> {importResult.profitCreated} 个
                </div>
                <div className="flex-1 text-red-600">
                  <span className="font-medium">失败:</span> {importResult.failed} 个
                </div>
              </div>

              {/* 错误详情 */}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-red-600">错误详情</label>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((error, index) => (
                      <div
                        key={index}
                        className="text-xs p-2 bg-red-50 rounded border border-red-200"
                      >
                        <div className="font-medium">第 {error.index + 1} 行:</div>
                        <div className="text-red-700 mt-1">{error.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isProcessing}
              className="flex-1"
            >
              {isProcessing ? '导入中...' : '开始导入'}
            </Button>
            <Button onClick={handleReset} type="default" disabled={isProcessing} className="flex-1">
              重置
            </Button>
          </div>

          {/* 提示信息 */}
          <div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded">
            <div className="font-semibold mb-2">CSV格式要求：</div>
            <div>• 支持的文件格式: CSV</div>
            <div>• 必填列: 账户名称, 日期, 快照金额</div>
            <div>• 可选列: 转入金额（如未提供则默认为0）</div>
            <div>• 日期格式: yyyy-MM-dd 或 yyyy/M/d</div>
            <div className="mt-2 font-semibold">示例：</div>
            <div className="font-mono bg-background p-2 rounded">
              账户名称,日期,快照金额,转入金额<br />
              招商银行,2025-04-30,10000,5000<br />
              招商银行,2025-05-31,12000,3000
            </div>
            <div className="mt-2 text-blue-600">• 自动创建收益交易：收益 = 本月快照 - 上月快照 - 本月转入</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
