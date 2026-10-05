'use client'

import { Button } from 'animal-island-ui'
import { endOfMonth } from 'date-fns'
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
import { useAccountStore } from '@/lib/stores'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import {
  convertImportedToAccount,
  convertImportedToAccountUpdate,
  importAccounts,
  parseImportedAccountCSV,
  parseImportedAccountJSON,
} from '@/lib/utils/account-import'

import { AccountType } from '@/types'
import type { Account, AccountImportResult } from '@/types'

interface ImportDialogProps {
  trigger?: React.ReactNode
  onImportSuccess?: () => void
}

export function ImportDialog({ trigger, onImportSuccess }: ImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResult, setImportResult] = useState<AccountImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const addAccount = useAccountStore((state) => state.addAccount)
  const updateAccount = useAccountStore((state) => state.updateAccount)
  const addSnapshot = useSnapshotStore((state) => state.addSnapshot)

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
        importedData = parseImportedAccountCSV(content)
      } else if (fileExtension === 'json') {
        importedData = parseImportedAccountJSON(content)
      } else {
        throw new Error('不支持的文件格式，请使用 JSON 或 CSV 文件')
      }

      // 使用 get() 获取最新的 accounts
      const currentAccounts = useAccountStore.getState().accounts

      // 验证并导入
      const result = importAccounts(currentAccounts, importedData)

      setImportResult(result)

      // 如果有成功的数据，执行导入
      if (result.success > 0 || result.updated > 0) {
        let addedCount = 0
        let updatedCount = 0

        // 使用最新的 currentAccounts 创建映射
        const existingAccountsByName = new Map<string, Account>()
        currentAccounts.forEach((acc) => {
          existingAccountsByName.set(acc.name.toLowerCase(), acc)
        })

        importedData.forEach((data, index) => {
          const hasError = result.errors.some((e) => e.index === index)

          if (!hasError) {
            const existingAccount = existingAccountsByName.get(data.name.toLowerCase())

            if (existingAccount) {
              const update = convertImportedToAccountUpdate(data)
              updateAccount(existingAccount.id, update)
              updatedCount++
            } else {
              // 添加新账户
              const account = convertImportedToAccount(data)
              const createdAccount = addAccount(account)
              existingAccountsByName.set(createdAccount.name.toLowerCase(), createdAccount)

              // 自动创建初始快照，以便计算收益
              // 注意：现金账户通常只作为资金中转，无需按月快照，跳过自动生成
              if (createdAccount.type !== AccountType.CASH) {
                // 使用账户的 createdAt 日期的月末作为快照日期
                const accountDate =
                  createdAccount.createdAt instanceof Date
                    ? createdAccount.createdAt
                    : new Date(createdAccount.createdAt)

                const snapshotDate = endOfMonth(accountDate)
                // 设置为月末的最后时刻
                snapshotDate.setHours(23, 59, 59, 999)

                addSnapshot({
                  accountId: createdAccount.id,
                  balance: createdAccount.balance,
                  snapshotDate,
                  note: '初始快照（导入时自动创建）',
                })
              }

              addedCount++
            }
          }
        })

        // 更新成功提示，显示新增和更新的数量
        const messages = []
        if (addedCount > 0) messages.push(`新增 ${addedCount} 个`)
        if (updatedCount > 0) messages.push(`更新 ${updatedCount} 个`)

        toast.success(`导入成功`, {
          description: `${messages.join('，')}账户${result.failed > 0 ? `，${result.failed} 个失败` : ''}`,
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
  }, [selectedFile, addAccount, addSnapshot, updateAccount, onImportSuccess])

  const handleReset = () => {
    setSelectedFile(null)
    setImportResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="default" icon={<UploadIcon className="h-4 w-4" />}>
            导入
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入账户数据</DialogTitle>
          <DialogDescription>选择 JSON 文件以批量导入账户数据</DialogDescription>
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
                  <span className="font-medium">总计:</span> {importResult.total} 个
                </div>
                <div className="flex-1 text-green-600">
                  <span className="font-medium">新增:</span> {importResult.success} 个
                </div>
                <div className="flex-1 text-blue-600">
                  <span className="font-medium">更新:</span> {importResult.updated} 个
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
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• 支持的文件格式: JSON、CSV</div>
            <div>
              • 必填字段:
              name（账户名称）、type（账户类型）、balance（余额）、initialBalance（初始余额）、currency（货币）
            </div>
            <div>• 同名账户将被更新，其他账户将被新增</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
