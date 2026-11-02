'use client'

import { Button } from 'animal-island-ui'
import { endOfDay } from 'date-fns'
import { useMemo, useState } from 'react'
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
  importSnapshotsAndCreateProfits,
  type SnapshotImportData,
} from '@/lib/utils/snapshot-import'
import { createSnapshotProfitSyncPlan, sumTransferInForMonth } from '@/lib/utils/snapshot-profit-sync'
import { parseStatementFile, type ParsedTable } from '@/lib/utils/statement-parser'
import { AccountType, TransactionType, type Account } from '@/types'

interface StatementImportDialogProps {
  trigger?: React.ReactNode
  onImportSuccess?: () => void
}

const PREVIEW_ROWS = 10
const NEW_ACCOUNT = '__new__'

/** 资产证明解析结果 → 目标账户映射：优先基金代码，其次名称精确，最后唯一包含匹配 */
function matchAccount(
  accountName: string,
  fundCode: string,
  accounts: Pick<Account, 'id' | 'name' | 'fundCode'>[]
): { accountId: string | null; matchedBy: 'fundCode' | 'name' | 'contains' | null } {
  const byCode = accounts.filter((a) => a.fundCode && a.fundCode === fundCode)
  if (byCode.length === 1) return { accountId: byCode[0].id, matchedBy: 'fundCode' }

  const byName = accounts.filter((a) => a.name === accountName)
  if (byName.length === 1) return { accountId: byName[0].id, matchedBy: 'name' }

  const contains = accounts.filter(
    (a) => a.name.includes(accountName) || accountName.includes(a.name)
  )
  if (contains.length === 1) return { accountId: contains[0].id, matchedBy: 'contains' }

  return { accountId: null, matchedBy: null }
}

export function StatementImportDialog({ trigger, onImportSuccess }: StatementImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [fileName, setFileName] = useState<string>('')
  const [table, setTable] = useState<ParsedTable | null>(null)
  /** 每行的目标账户（accountId 或 NEW_ACCOUNT 表示新建） */
  const [mappings, setMappings] = useState<(string | typeof NEW_ACCOUNT)[]>([])
  /** 每行在 app 账户页对应的账户名（按基金代码替换后；未匹配行为 null） */
  const [appNames, setAppNames] = useState<(string | null)[]>([])

  const accounts = useAccountStore((state) => state.accounts)
  const addAccount = useAccountStore((state) => state.addAccount)
  const addTransaction = useTransactionStore((state) => state.addTransaction)
  const addTransactions = useTransactionStore((state) => state.addTransactions)
  const updateTransaction = useTransactionStore((state) => state.updateTransaction)
  const deleteMultiple = useTransactionStore((state) => state.deleteMultiple)
  const { addSnapshot, deleteSnapshot, updateSnapshot } = useSnapshotStore()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setTable(null)

    try {
      const parsed = await parseStatementFile(file)
      if (parsed.headers === null && parsed.rows.length === 0) {
        toast.error('未能从文件中解析出表格内容')
        return
      }
      setTable(parsed)
      setFileName(file.name)

      // 蚂蚁基金两类对账单：按基金代码把账户名称替换为 app 账户页的名称，并自动匹配目标账户
      const headers = parsed.headers ?? []
      const nameIdx = Math.max(headers.indexOf('基金名称'), headers.indexOf('账户名称'))
      const codeIdx = headers.indexOf('基金代码')
      if (
        (parsed.parserMode === 'ant-asset' || parsed.parserMode === 'ant-fund') &&
        nameIdx >= 0 &&
        codeIdx >= 0
      ) {
        const replaced: (string | null)[] = parsed.rows.map((row) => {
          const hit = accounts.filter((a) => a.fundCode && a.fundCode === row[codeIdx])
          if (hit.length === 1) {
            row[nameIdx] = hit[0].name
            return hit[0].name
          }
          return null
        })
        setAppNames(replaced)
        const replacedCount = replaced.filter(Boolean).length
        setMappings(
          parsed.rows.map((row, i) => {
            if (replaced[i]) {
              const acc = accounts.find((a) => a.name === replaced[i])
              if (acc) return acc.id
            }
            return matchAccount(row[nameIdx], row[codeIdx], accounts).accountId ?? NEW_ACCOUNT
          })
        )
        if (replacedCount > 0 && replacedCount < parsed.rows.length) {
          toast.info(`已按基金代码匹配 ${replacedCount} 个账户`, {
            description: `其余 ${parsed.rows.length - replacedCount} 行未找到相同基金代码的账户，将按原名称处理（可在目标账户列调整）`,
          })
        }
      } else {
        setMappings([])
        setAppNames([])
      }

      toast.success('解析成功', {
        description:
          parsed.source === 'csv'
            ? `已跳过 ${parsed.skippedLineCount} 行说明，识别出 ${parsed.rows.length} 行数据`
            : `PDF 共 ${parsed.pdfPageCount} 页，识别出 ${parsed.rows.length} 行数据`,
      })
    } catch (error) {
      console.error('[对账单解析失败]', error)
      toast.error('文件解析失败', {
        description: error instanceof Error ? error.message : '请检查文件格式',
      })
    } finally {
      setIsParsing(false)
      // 允许重复选择同一个文件
      event.target.value = ''
    }
  }

  const handleReset = () => {
    setTable(null)
    setFileName('')
    setMappings([])
    setAppNames([])
  }

  /** 蚂蚁基金交易明细 → 交易记录。输出列为 账户名称/基金代码/确认金额/日期（当月最后一天）/交易类型/转账目标账户名称；
   *  每条转入记录前配一条「现金账户」转出行（金额为负）。导入时按系统惯例存正数金额（方向由类型表达）。
   *  同月替换：导入数据涉及的月份，该月所有带「对账单导入」标签的旧交易先删除再写入新数据。 */
  const handleImportTransactions = async () => {
    if (!table || table.parserMode !== 'ant-fund') return
    setIsImporting(true)

    try {
      // 固定 6 列布局：账户名称[0] 基金代码[1] 确认金额[2] 日期[3] 交易类型[4] 转账目标账户名称[5]
      const validTypes = new Set<string>(Object.values(TransactionType))

      // 1. 新建映射到「新建账户」的账户（转出行按现金类型、转入行按基金类型）
      const nameToAccount = new Map(accounts.map((a) => [a.name, a]))
      for (let i = 0; i < table.rows.length; i++) {
        if (mappings[i] !== NEW_ACCOUNT) continue
        const accountName = table.rows[i][0]
        const fundCode = table.rows[i][1]
        if (!accountName || nameToAccount.has(accountName)) continue
        const isTransferOut = table.rows[i][4] === 'transfer_out'
        const created = addAccount({
          name: accountName,
          type: isTransferOut ? AccountType.CASH : AccountType.FUND,
          balance: 0,
          initialBalance: 0,
          currency: 'CNY',
          color: '#f0e8d8',
          fundCode: isTransferOut ? undefined : fundCode || undefined,
          description: '对账单导入自动创建',
        })
        nameToAccount.set(created.name, created)
      }

      // 2. 构造交易批次（金额/日期/类型无效的行跳过）
      const batch: Array<Parameters<typeof addTransactions>[0][number]> = []
      let unsupported = 0

      for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i]
        const txnType = validTypes.has(row[4]) ? (row[4] as TransactionType) : null
        if (!txnType) {
          unsupported++
          continue
        }

        const targetId = mappings[i] === NEW_ACCOUNT ? null : mappings[i]
        const target =
          (targetId && accounts.find((a) => a.id === targetId)) || nameToAccount.get(row[0])
        if (!target) {
          unsupported++
          continue
        }

        const amount = parseFloat((row[2] ?? '').replace(/,/g, ''))
        const [y, mo, d] = (row[3] ?? '').split('/').map(Number)
        if (isNaN(amount) || isNaN(y) || isNaN(mo) || isNaN(d)) {
          unsupported++
          continue
        }
        const txnDate = new Date(y, mo - 1, d)

        batch.push({
          accountId: target.id,
          type: txnType,
          amount: Math.abs(amount), // 系统惯例：金额恒为正数，方向由交易类型表达
          // 描述只保留账户名（转出行为目标账户名，转入行为本账户名）
          description:
            txnType === TransactionType.TRANSFER_OUT ? row[5] || target.name : target.name,
          tags: ['对账单导入'],
          createdAt: txnDate,
        })
      }

      if (batch.length === 0) {
        toast.error('没有可导入的交易', { description: '未识别到金额/日期有效的记录' })
        return
      }

      // 3. 同月覆盖：导入数据涉及的月份，该月所有带「对账单导入」标签的旧交易全部替换
      //    （不区分账户——账户映射调整后，旧映射账户的同月旧记录也一并清除）
      const affectedMonths = new Set(
        batch.map((t) => {
          const d = t.createdAt as Date
          return `${d.getFullYear()}-${d.getMonth()}`
        })
      )
      const staleIds = useTransactionStore
        .getState()
        .transactions.filter((t) => {
          if (!t.tags?.includes('对账单导入')) return false
          const d = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)
          return affectedMonths.has(`${d.getFullYear()}-${d.getMonth()}`)
        })
        .map((t) => t.id)
      if (staleIds.length > 0) {
        deleteMultiple(staleIds)
      }

      addTransactions(batch)

      // 4. 回填月末快照的「本月投入」：对涉及的 (账户, 月)，若快照未记录投入，
      //    用该月转入交易合计填上；再重新同步收益交易（收益 = 快照差 - 投入）
      const latestTransactions = useTransactionStore.getState().transactions
      const allSnapshots = useSnapshotStore.getState().snapshots
      let backfilled = 0
      const touched = new Set(batch.map((t) => `${t.accountId}:${(t.createdAt as Date).getFullYear()}-${(t.createdAt as Date).getMonth()}`))
      for (const snap of allSnapshots) {
        const d = snap.snapshotDate instanceof Date ? snap.snapshotDate : new Date(snap.snapshotDate)
        if (!touched.has(`${snap.accountId}:${d.getFullYear()}-${d.getMonth()}`)) continue
        if (snap.investmentAmount) continue // 用户手填的投入不覆盖
        const transferIn = sumTransferInForMonth(latestTransactions, snap.accountId, d)
        if (transferIn > 0) {
          updateSnapshot(snap.id, { investmentAmount: transferIn })
          backfilled++
        }
      }
      const profitSyncPlan = createSnapshotProfitSyncPlan(
        useAccountStore.getState().accounts,
        useSnapshotStore.getState().snapshots,
        useTransactionStore.getState().transactions
      )
      if (profitSyncPlan.deleteIds.length > 0) deleteMultiple(profitSyncPlan.deleteIds)
      profitSyncPlan.update.forEach(({ id, updates }) => updateTransaction(id, updates))
      profitSyncPlan.create.forEach((transaction) => addTransaction(transaction))

      const newCount = new Set(
        table.rows
          .filter((_, i) => mappings[i] === NEW_ACCOUNT)
          .map((r) => r[0])
      ).size
      toast.success('已导入交易记录', {
        description:
          `创建 ${batch.length} 条交易（新建 ${newCount} 个账户）` +
          (staleIds.length > 0 ? `，覆盖 ${staleIds.length} 条旧导入记录` : '') +
          (backfilled > 0 ? `，回填 ${backfilled} 条快照的本月投入并重算收益` : '') +
          (unsupported > 0 ? `，${unsupported} 条数据无效已跳过` : ''),
      })
      onImportSuccess?.()
      setTimeout(() => {
        setOpen(false)
        handleReset()
      }, 1500)
    } catch (error) {
      console.error('[对账单交易导入失败]', error)
      toast.error('导入失败', {
        description: error instanceof Error ? error.message : '未知错误',
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleImport = async () => {
    if (!table || table.parserMode !== 'ant-asset') return
    setIsImporting(true)

    try {
      // 1. 新建映射到「新建账户」的账户（基金类型，带基金代码）
      const nameToAccount = new Map(accounts.map((a) => [a.name, a]))
      for (let i = 0; i < table.rows.length; i++) {
        if (mappings[i] !== NEW_ACCOUNT) continue
        const [accountName, fundCode] = table.rows[i]
        if (nameToAccount.has(accountName)) continue
        const created = addAccount({
          name: accountName,
          type: AccountType.FUND,
          balance: 0,
          initialBalance: 0,
          currency: 'CNY',
          color: '#f0e8d8',
          fundCode: fundCode || undefined,
          description: '对账单导入自动创建',
        })
        nameToAccount.set(created.name, created)
      }

      // 2. 构造快照导入数据（账户名 = 实际落地的账户名；金额无效的行跳过并提示）
      const importData: SnapshotImportData[] = []
      const invalidRows: number[] = []
      table.rows.forEach((row, i) => {
        const [accountName, , balanceStr, dateStr] = row
        const targetId = mappings[i] === NEW_ACCOUNT ? null : mappings[i]
        const target =
          (targetId && accounts.find((a) => a.id === targetId)) || nameToAccount.get(accountName)
        const [y, m, d] = dateStr.split('/').map(Number)
        const balance = parseFloat(balanceStr.replace(/,/g, ''))
        if (!target || isNaN(balance) || isNaN(y) || isNaN(m) || isNaN(d)) {
          invalidRows.push(i + 1)
          return
        }
        const snapshotDay = new Date(y, m - 1, d)
        importData.push({
          accountName: target.name,
          date: endOfDay(snapshotDay), // 与 CSV 快照导入一致：记为当天最后时刻
          snapshotBalance: balance,
          // 本月投入：从已导入的该月转入交易统计（先导快照后导交易时，交易导入会再回填）
          transferIn: sumTransferInForMonth(
            useTransactionStore.getState().transactions,
            target.id,
            snapshotDay
          ),
        })
      })
      if (invalidRows.length > 0) {
        toast.warning(`第 ${invalidRows.join('、')} 行金额或日期无效，已跳过`)
      }
      if (importData.length === 0) {
        toast.error('没有可导入的数据')
        return
      }

      // 3. 复用快照导入管线：清理同月旧数据 → 建快照 → 同步收益交易
      const currentAccounts = useAccountStore.getState().accounts
      const cleanupPlan = createSnapshotImportCleanupPlan(
        importData,
        currentAccounts,
        useTransactionStore.getState().transactions,
        useSnapshotStore.getState().snapshots
      )
      if (cleanupPlan.transactionIds.length > 0) {
        deleteMultiple(cleanupPlan.transactionIds)
      }
      cleanupPlan.snapshotIds.forEach((snapshotId) => deleteSnapshot(snapshotId))

      const importResult = importSnapshotsAndCreateProfits(
        importData,
        currentAccounts.map((a) => ({ id: a.id, name: a.name })),
        addTransaction,
        addSnapshot
      )

      const profitSyncPlan = createSnapshotProfitSyncPlan(
        useAccountStore.getState().accounts,
        useSnapshotStore.getState().snapshots,
        useTransactionStore.getState().transactions
      )
      if (profitSyncPlan.deleteIds.length > 0) {
        deleteMultiple(profitSyncPlan.deleteIds)
      }
      profitSyncPlan.update.forEach(({ id, updates }) => updateTransaction(id, updates))
      profitSyncPlan.create.forEach((transaction) => addTransaction(transaction))

      const newCount = mappings.filter((m) => m === NEW_ACCOUNT).length
      if (importResult.success > 0) {
        toast.success('已导入月末快照', {
          description:
            `创建 ${importResult.success} 个快照（新建 ${newCount} 个账户）` +
            `${importResult.profitCreated + profitSyncPlan.create.length > 0 ? `，生成 ${importResult.profitCreated + profitSyncPlan.create.length} 条收益交易` : ''}` +
            `${importResult.failed > 0 ? `，${importResult.failed} 条失败` : ''}`,
        })
        onImportSuccess?.()
        setTimeout(() => {
          setOpen(false)
          handleReset()
        }, 1500)
      } else {
        toast.error('导入失败', { description: importResult.errors[0]?.error ?? '无有效数据' })
      }
    } catch (error) {
      console.error('[对账单导入失败]', error)
      toast.error('导入失败', {
        description: error instanceof Error ? error.message : '未知错误',
      })
    } finally {
      setIsImporting(false)
    }
  }

  // 预览矩阵：表头 + 全部数据行（容器内滚动）
  const previewRows = table ? table.rows : []
  const columnCount = table
    ? Math.max(table.headers?.length ?? 0, ...previewRows.map((r) => r.length))
    : 0
  const isAssetMode = table?.parserMode === 'ant-asset'
  const isFundMode = table?.parserMode === 'ant-fund'
  const hasAccountMapping = isAssetMode || isFundMode

  /** 匹配统计：按基金代码替换 / 已匹配现有账户 / 待新建 */
  const matchStats = useMemo(() => {
    if (!hasAccountMapping) return { replaced: 0, matched: 0, newCount: 0 }
    return {
      replaced: appNames.filter(Boolean).length,
      matched: mappings.filter((m) => m !== NEW_ACCOUNT).length,
      newCount: mappings.filter((m) => m === NEW_ACCOUNT).length,
    }
  }, [hasAccountMapping, mappings, appNames])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="default" icon={<UploadIcon className="h-4 w-4" />}>
            导入对账单
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入对账单（月度透视表）</DialogTitle>
          <DialogDescription>
            支持 CSV / PDF 对账单。蚂蚁基金「资产证明」可导入为月末快照，「基金交易明细」可导入为交易记录，均按基金代码自动匹配或新建账户。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 文件选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">选择对账单文件</label>
            <input
              type="file"
              accept=".csv,.pdf,.txt,.tsv"
              onChange={handleFileSelect}
              disabled={isParsing}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/80"
            />
            {fileName && (
              <p className="text-sm text-muted-foreground">
                已选择: {fileName}
                {isParsing && '（解析中...）'}
              </p>
            )}
          </div>

          {/* 解析结果预览 */}
          {table && (
            <div className="space-y-3">
              {/* 解析摘要 */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <span>来源: {table.source === 'csv' ? 'CSV' : 'PDF'}</span>
                {table.parserMode && (
                  <span>
                    模式:{' '}
                    {table.parserMode === 'ant-fund'
                      ? '蚂蚁基金交易明细（多行记录）'
                      : table.parserMode === 'ant-asset'
                        ? '蚂蚁基金资产证明（持仓快照）'
                        : '通用表格'}
                  </span>
                )}
                {table.source === 'csv' && <span>跳过说明行: {table.skippedLineCount} 行</span>}
                <span>识别数据: {table.rows.length} 行</span>
                <span>列数: {columnCount}</span>
                {table.source === 'pdf' && <span>页数: {table.pdfPageCount}</span>}
              </div>

              {/* 表格预览（HTML table 保证列对齐） */}
              <div className="border rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/70 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-muted-foreground font-medium border-r">
                          #
                        </th>
                        {Array.from({ length: columnCount }).map((_, colIndex) => (
                          <th
                            key={colIndex}
                            className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                          >
                            {table.headers?.[colIndex] ?? `列${colIndex + 1}`}
                          </th>
                        ))}
                        {hasAccountMapping && (
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                            目标账户
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="border-t hover:bg-muted/30 whitespace-nowrap"
                        >
                          <td className="px-2 py-1.5 text-muted-foreground border-r text-center">
                            {rowIndex + 1}
                          </td>
                          {Array.from({ length: columnCount }).map((_, colIndex) => (
                            <td key={colIndex} className="px-3 py-1.5">
                              {row[colIndex] ?? ''}
                            </td>
                          ))}
                          {hasAccountMapping && (
                            <td className="px-2 py-1.5">
                              <select
                                value={mappings[rowIndex] ?? NEW_ACCOUNT}
                                onChange={(e) => {
                                  const next = [...mappings]
                                  next[rowIndex] = e.target.value
                                  setMappings(next)
                                }}
                                disabled={isImporting}
                                className="w-full max-w-44 rounded-md border border-input bg-background px-2 py-1 text-xs"
                              >
                                <option value={NEW_ACCOUNT}>
                                  ➕ 新建「
                                  {row[
                                    Math.max(
                                      table.headers?.indexOf('基金名称') ?? -1,
                                      table.headers?.indexOf('账户名称') ?? -1,
                                      0
                                    )
                                  ]}
                                  」
                                </option>
                                {accounts.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.name}
                                    {a.fundCode ? ` (${a.fundCode})` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {isAssetMode ? (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                    按基金代码已将 {matchStats.replaced} 行的账户名称替换为账户页名称；
                    {matchStats.matched} 条已匹配现有账户，{matchStats.newCount}{' '}
                    条将新建基金账户（可在上方「目标账户」列调整）。同月的旧快照和旧收益交易会被覆盖。
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="default" onClick={handleReset} disabled={isParsing || isImporting}>
                      重新选择
                    </Button>
                    <Button onClick={handleImport} disabled={isParsing || isImporting}>
                      {isImporting ? '导入中...' : `导入 ${table.rows.length} 条到月末快照`}
                    </Button>
                  </div>
                </div>
              ) : isFundMode ? (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                    按基金代码已将 {matchStats.replaced} 行的账户名称替换为账户页名称；
                    {matchStats.matched} 条已匹配现有账户，{matchStats.newCount}{' '}
                    条将新建基金账户（可在上方「目标账户」列调整）。每笔定投生成一对记录：
                    「现金账户」转出（金额为负）+ 基金账户转入，日期归到当月最后一天；
                    同账户同月的旧导入记录会被覆盖。
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="default" onClick={handleReset} disabled={isParsing || isImporting}>
                      重新选择
                    </Button>
                    <Button onClick={handleImportTransactions} disabled={isParsing || isImporting}>
                      {isImporting ? '导入中...' : `导入 ${table.rows.length} 条交易记录`}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground bg-muted/50 border rounded-lg p-3">
                    该文件以通用表格模式解析，仅支持预览。导入月末快照请使用蚂蚁基金「资产证明」
                    PDF，导入交易记录请使用「基金交易明细」PDF。
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="default" onClick={handleReset} disabled={isParsing}>
                      重新选择
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
