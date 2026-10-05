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
import { useTransactionStore, useAccountStore } from '@/lib/stores'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import { detectPotentialFilterIssues } from '@/lib/utils/csv-validator'
import { createSnapshotProfitSyncPlan } from '@/lib/utils/snapshot-profit-sync'
import {
  parseImportedJSON,
  parseImportedCSV,
  convertImportedToTransaction,
  separateTransactionTypes,
  calculateInvestmentAmounts,
  detectOverlappingAccountMonths,
  expandImportedTransferPairs,
} from '@/lib/utils/transaction-import'
import { type ImportResult } from '@/types'

import type { Snapshot } from '@/lib/stores/snapshot-store'

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
  const updateTransaction = useTransactionStore((state) => state.updateTransaction)
  const deleteMultiple = useTransactionStore((state) => state.deleteMultiple)
  const deleteSnapshot = useSnapshotStore((state) => state.deleteSnapshot)
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)

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

    console.log('[Import Debug] ========== 开始导入流程 ==========')
    console.log('[Import Debug] 当前交易总数:', transactions.length)
    console.log('[Import Debug] 当前快照总数:', useSnapshotStore.getState().snapshots.length)

    setIsProcessing(true)
    try {
      // 读取文件内容
      const content = await selectedFile.text()
      console.log('[Import Debug] 文件内容长度:', content.length)

      // 根据文件扩展名选择解析器
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()
      let parsedImportData

      // CSV文件筛选检测
      if (fileExtension === 'csv') {
        const validation = detectPotentialFilterIssues(content)
        if (validation.hasIssue) {
          const warningMsg = validation.warnings.join('；')
          const suggestionMsg = validation.suggestions.join('；')

          toast.warning('CSV文件可能存在问题', {
            description: `${warningMsg}。建议：${suggestionMsg}`,
            duration: 5000,
          })

          // 询问用户是否继续
          const shouldContinue = confirm(
            `CSV文件可能存在问题：\n\n${warningMsg}\n\n建议：${suggestionMsg}\n\n是否继续导入？`
          )

          if (!shouldContinue) {
            setIsProcessing(false)
            return
          }
        }
      }

      if (fileExtension === 'csv') {
        parsedImportData = parseImportedCSV(content, accounts)
      } else if (fileExtension === 'json') {
        parsedImportData = parseImportedJSON(content, accounts)
      } else {
        throw new Error('不支持的文件格式，请使用 JSON 或 CSV 文件')
      }

      const importedData = expandImportedTransferPairs(parsedImportData)

      // 步骤 1: 分离三种交易类型
      const { snapshots, transferIns, otherTransactions } = separateTransactionTypes(importedData)
      console.log('[Import Debug] 解析结果 - 快照:', snapshots.length, '转入:', transferIns.length, '其他交易:', otherTransactions.length)

      // 步骤 2: 计算每个快照的投资金额（来自同月的转入）
      const investmentAmounts = calculateInvestmentAmounts(snapshots, transferIns)

      // 步骤 3: 处理其他交易和转入交易
      const otherTransactionResult: ImportResult = {
        total: 0,
        success: 0,
        updated: 0,
        failed: 0,
        errors: [],
        updates: [],
        deleted: 0,
        deletedSnapshots: 0,
        deletedAccountMonths: [],
      }
      let otherTransactionSuccess = 0
      const otherTransactionUpdated = 0

      // 将 transferIns 也作为普通交易处理
      const allOtherTransactions = [...otherTransactions, ...transferIns]

      if (allOtherTransactions.length > 0) {
        // 步骤 3.1: 彻底清理 - 删除所有导入账户在对应月份的所有旧数据（不管类型）
        const existingSnapshots = useSnapshotStore.getState().snapshots

        console.log('[Import Debug] ========== 开始彻底清理旧数据 ==========')
        console.log('[Import Debug] 原始交易数量:', transactions.length)
        console.log('[Import Debug] 导入数据数量:', allOtherTransactions.length)

        // 收集所有导入数据中的账户ID和月份组合
        const importedMonthsSet = new Set<string>()
        allOtherTransactions.forEach((data) => {
          if (data.accountId && data.createdAt) {
            const date = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt)
            const monthKey = `${data.accountId}:${date.getFullYear()}:${date.getMonth()}`
            importedMonthsSet.add(monthKey)
          }
        })

        console.log('[Import Debug] 导入的账户-月份组合:', Array.from(importedMonthsSet))

        // 删除所有这些账户-月份组合的交易（不管类型）
        const transactionsToDelete: string[] = []
        const snapshotsToDelete: string[] = []

        transactions.forEach((txn) => {
          const date = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
          const monthKey = `${txn.accountId}:${date.getFullYear()}:${date.getMonth()}`

          if (importedMonthsSet.has(monthKey)) {
            transactionsToDelete.push(txn.id)
          }
        })

        // 删除这些月份的快照
        existingSnapshots.forEach((snap) => {
          const date = snap.snapshotDate instanceof Date ? snap.snapshotDate : new Date(snap.snapshotDate)
          const monthKey = `${snap.accountId}:${date.getFullYear()}:${date.getMonth()}`

          if (importedMonthsSet.has(monthKey)) {
            snapshotsToDelete.push(snap.id)
          }
        })

        console.log('[Import Debug] 将删除交易:', transactionsToDelete.length, '快照:', snapshotsToDelete.length)

        // 执行删除
        if (transactionsToDelete.length > 0) {
          deleteMultiple(transactionsToDelete)
          console.log('[Import Debug] ✓ 已删除', transactionsToDelete.length, '条旧交易')
        }

        if (snapshotsToDelete.length > 0) {
          snapshotsToDelete.forEach((id) => deleteSnapshot(id))
          console.log('[Import Debug] ✓ 已删除', snapshotsToDelete.length, '条旧快照')
        }

        console.log('[Import Debug] ========== 清理完成，开始导入新数据 ==========')

        // 步骤 3.2: 直接添加所有导入的交易
        allOtherTransactions.forEach((data) => {
          try {
            const transaction = convertImportedToTransaction(data)
            addTransaction(transaction)
            otherTransactionSuccess++
          } catch (error) {
            console.error('添加交易失败:', error)
            otherTransactionResult.errors.push({
              index: allOtherTransactions.indexOf(data),
              row: data,
              error: error instanceof Error ? error.message : '未知错误'
            })
            otherTransactionResult.failed++
          }
        })

        // 更新结果对象
        otherTransactionResult.total = allOtherTransactions.length
        otherTransactionResult.success = otherTransactionSuccess
        otherTransactionResult.updated = otherTransactionUpdated
        otherTransactionResult.deleted = transactionsToDelete.length
        otherTransactionResult.deletedSnapshots = snapshotsToDelete.length
        otherTransactionResult.deletedAccountMonths = Array.from(importedMonthsSet).map((monthKey) => {
          const [accountId, year, month] = monthKey.split(':')
          const account = accounts.find((a) => a.id === accountId)
          return {
            accountId,
            accountName: account?.name || accountId,
            year: parseInt(year),
            month: parseInt(month),
            deletedTransactionCount: transactionsToDelete.filter(id => {
              const txn = transactions.find(t => t.id === id)
              if (!txn) return false
              const date = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
              const txnMonthKey = `${txn.accountId}:${date.getFullYear()}:${date.getMonth()}`
              return txnMonthKey === monthKey
            }).length,
            deletedSnapshotCount: snapshotsToDelete.filter(id => {
              const snap = existingSnapshots.find(s => s.id === id)
              if (!snap) return false
              const date = snap.snapshotDate instanceof Date ? snap.snapshotDate : new Date(snap.snapshotDate)
              const snapMonthKey = `${snap.accountId}:${date.getFullYear()}:${date.getMonth()}`
              return snapMonthKey === monthKey
            }).length,
          }
        })
      }

      // 步骤 4: 处理快照（transferIns 不单独存储，已转换为投资金额）
      // 🔴 重要：在处理快照之前，也需要检测并删除同一账户同一月的旧快照数据
      if (snapshots.length > 0) {
        console.log('[Import Debug] ========== 开始处理快照删除 ==========')
        const existingSnapshots = useSnapshotStore.getState().snapshots

        // 将导入的快照数据转换为 Snapshot 格式（用于检测重叠）
        const importedSnapshots: Snapshot[] = snapshots
          .filter((data) => data.accountId)
          .map((data) => ({
            id: `temp-${Date.now()}-${Math.random()}`, // 临时ID用于检测
            accountId: data.accountId!,
            balance: data.balance || data.amount || 0,
            snapshotDate: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt!),
            note: data.note,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))

        console.log('[Import Debug] 导入的快照数据:', importedSnapshots.map(s => ({
          accountId: s.accountId,
          snapshotDate: s.snapshotDate,
          month: `${s.snapshotDate.getFullYear()}-${s.snapshotDate.getMonth() + 1}`,
          balance: s.balance
        })))

        // 检测快照的月份重叠（传入空数组作为导入的交易）
        const snapshotOverlaps = detectOverlappingAccountMonths(
          [], // 导入快照时不考虑交易重叠
          existingSnapshots,
          [], // 没有导入交易
          importedSnapshots
        )

        console.log('[Import Debug] 检测到的快照重叠:', Array.from(snapshotOverlaps.entries()).map(([key, data]) => ({
          monthKey: key,
          snapshotCount: data.snapshotIds.length
        })))

        // 删除重叠的快照和相关的交易（收益/亏损）
        if (snapshotOverlaps.size > 0) {
          snapshotOverlaps.forEach((monthData, monthKey) => {
            console.log(`[Import Debug] 删除快照月份 ${monthKey} 的数据:`, {
              快照: monthData.snapshotIds.length,
              交易: monthData.transactionIds.length
            })

            // 删除该月份的所有旧快照
            monthData.snapshotIds.forEach((id) => {
              deleteSnapshot(id)
            })

            // 删除该月份的所有旧交易（包括收益/亏损交易）
            if (monthData.transactionIds.length > 0) {
              deleteMultiple(monthData.transactionIds)
            }
          })
        }
      }

      let snapshotSuccessCount = 0
      let snapshotErrorCount = 0
      const snapshotErrors: Array<{ index: number; error: string }> = []

      snapshots.forEach((snapshotData, index) => {
        try {
          // 获取该快照对应的投资金额（用于存储但不创建交易记录）
          const investmentAmount = investmentAmounts.get(index) || 0

          // 转换为快照数据格式
          const snapshotAmount = snapshotData.balance || snapshotData.amount || 0
          // 确保 createdAt 是 Date 对象
          const snapshotDate = snapshotData.createdAt instanceof Date
            ? snapshotData.createdAt
            : new Date(snapshotData.createdAt!)

          // 直接创建快照记录，不创建相关的交易记录（收益/亏损、投资）
          const { addSnapshot } = useSnapshotStore.getState()
          addSnapshot({
            accountId: snapshotData.accountId,
            balance: snapshotAmount,
            snapshotDate,
            investmentAmount: investmentAmount > 0 ? investmentAmount : undefined,
            note: snapshotData.note,
          })

          snapshotSuccessCount++
        } catch (error) {
          console.error('快照处理失败:', error)
          snapshotErrorCount++
          snapshotErrors.push({
            index,
            error: error instanceof Error ? error.message : '未知错误',
          })
        }
      })

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

      console.log(
        `[快照导入] 收益交易同步完成：新增 ${snapshotProfitSyncPlan.create.length}，更新 ${snapshotProfitSyncPlan.update.length}，删除 ${snapshotProfitSyncPlan.deleteIds.length}`
      )

      // 步骤 5: 显示综合结果
      const totalSuccess = otherTransactionSuccess + snapshotSuccessCount
      const totalUpdated = otherTransactionUpdated

      if (totalSuccess > 0 || totalUpdated > 0) {
        let message = `成功导入 ${totalSuccess} 条记录`

        // 添加更新信息
        if (totalUpdated > 0) {
          message += `，更新 ${totalUpdated} 条记录`
        }

        // 添加删除信息（如果有）
        if (otherTransactionResult.deleted > 0 || otherTransactionResult.deletedSnapshots > 0) {
          const monthsList = otherTransactionResult.deletedAccountMonths
            .map((m) => `${m.accountName}的${m.year}年${m.month + 1}月`)
            .join('、')

          const deletedMsg = `已删除 ${otherTransactionResult.deleted} 条旧交易${otherTransactionResult.deletedSnapshots > 0 ? `和 ${otherTransactionResult.deletedSnapshots} 条旧快照` : ''}（${monthsList}）`
          message += `，${deletedMsg}`
        }

        // 如果有快照，显示快照相关信息
        if (snapshotSuccessCount > 0) {
          const totalInvestment = Array.from(investmentAmounts.values())
            .reduce((sum, amount) => sum + amount, 0)

          message += `\n其中 ${snapshotSuccessCount} 个月末快照已创建`
          if (totalInvestment > 0) {
            message += `，总投资金额: ${totalInvestment.toFixed(0)}元`
          }
          if (
            snapshotProfitSyncPlan.create.length > 0 ||
            snapshotProfitSyncPlan.update.length > 0 ||
            snapshotProfitSyncPlan.deleteIds.length > 0
          ) {
            message +=
              `，收益交易同步：新增 ${snapshotProfitSyncPlan.create.length} 个` +
              `，更新 ${snapshotProfitSyncPlan.update.length} 个` +
              `，删除 ${snapshotProfitSyncPlan.deleteIds.length} 个`
          }
        }

        if (snapshotErrorCount > 0) {
          message += `，${snapshotErrorCount} 个快照处理失败`
        }

        toast.success('导入成功', {
          description: message,
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
  }, [
    selectedFile,
    transactions,
    addTransaction,
    deleteMultiple,
    deleteSnapshot,
    updateTransaction,
    onImportSuccess,
    accounts,
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
            导入
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入交易数据</DialogTitle>
          <DialogDescription>选择 JSON 或 CSV 文件以批量导入交易数据</DialogDescription>
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
              <div className="text-sm text-muted-foreground">已选择: {selectedFile.name}</div>
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
                <div className="flex-1 text-blue-600">
                  <span className="font-medium">更新:</span> {importResult.updated} 条
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
            <Button onClick={handleReset} type="default" disabled={isProcessing} className="flex-1">
              重置
            </Button>
          </div>

          {/* 提示信息 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• 支持的文件格式: JSON、CSV</div>
            <div>
              • 必填字段: accountId（账户ID）/账户名称、type（交易类型）、createdAt（创建时间）
            </div>
            <div>• 已存在的交易 ID 会被自动跳过</div>
            <div>• 账户 ID 或名称必须在系统中存在，否则会跳过该记录</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
