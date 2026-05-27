'use client'

import { useState, useCallback } from 'react'
import { UploadIcon } from '@/lib/components/icon-adapter'
import { Button } from 'animal-island-ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { parseImportedJSON, parseImportedCSV, importTransactions, convertImportedToTransaction } from '@/lib/utils/transaction-import'
import { useTransactionStore, useAccountStore } from '@/lib/stores'
import type { Transaction, ImportResult } from '@/types'
import { toast } from 'sonner'

interface ImportDialogProps {
  trigger?: React.ReactNode
  onImportSuccess?: () => void
}

export function ImportDialog({ trigger, onImportSuccess }: ImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const addTransaction = useTransactionStore((state) => state.addTransaction)
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)
  const existingAccountIds = accounts.map(a => a.id)

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

      // 根据文件扩展名选择解析器
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()
      let importedData

      if (fileExtension === 'csv') {
        importedData = parseImportedCSV(content, accounts)
      } else if (fileExtension === 'json') {
        importedData = parseImportedJSON(content)
      } else {
        throw new Error('不支持的文件格式，请使用 JSON 或 CSV 文件')
      }

      // 验证并导入
      const result = importTransactions(transactions, importedData, existingAccountIds)

      setImportResult(result)

      // 如果有成功的数据，执行导入
      if (result.success > 0) {
        let addedCount = 0
        importedData.forEach((data, index) => {
          // 跳过有错误的记录
          const hasError = result.errors.some(e => e.index === index)
          if (!hasError) {
            const transaction = convertImportedToTransaction(data)
            addTransaction(transaction)
            addedCount++
          }
        })

        toast.success(`导入成功`, {
          description: `成功导入 ${addedCount} 条交易${result.failed > 0 ? `，${result.failed} 条失败` : ''}`,
        })

        if (onImportSuccess) {
          onImportSuccess()
        }

        // 延迟关闭对话框，让用户看到结果
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
  }, [selectedFile, transactions, existingAccountIds, addTransaction, onImportSuccess, accounts])

  const handleReset = () => {
    setSelectedFile(null)
    setImportResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="default"
            icon={<UploadIcon className="h-4 w-4" />}
          >
            导入
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入交易数据</DialogTitle>
          <DialogDescription>
            选择 JSON 或 CSV 文件以批量导入交易数据
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 文件选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">选择文件</label>
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/80
              "
            />
            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                已选择: {selectedFile.name}
              </div>
            )}
          </div>

          {/* 导入结果 */}
          {importResult && (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <div className="flex-1">
                  <span className="font-medium">总计:</span> {importResult.total} 条
                </div>
                <div className="flex-1 text-green-600">
                  <span className="font-medium">成功:</span> {importResult.success} 条
                </div>
                <div className="flex-1 text-red-600">
                  <span className="font-medium">失败:</span> {importResult.failed} 条
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
            <Button
              onClick={handleReset}
              type="default"
              disabled={isProcessing}
              className="flex-1"
            >
              重置
            </Button>
          </div>

          {/* 提示信息 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• 支持的文件格式: JSON、CSV</div>
            <div>• 必填字段: accountId（账户ID）/账户名称、type（交易类型）、createdAt（创建时间）</div>
            <div>• 已存在的交易 ID 会被自动跳过</div>
            <div>• 账户 ID 或名称必须在系统中存在，否则会跳过该记录</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
