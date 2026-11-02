'use client'

import { Divider , Button } from 'animal-island-ui'
import { useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

import { AccountGrid } from '@/components/accounts/account-grid'
import { AddAccountDialog } from '@/components/accounts/add-account-dialog'
import { BatchDeleteDialog } from '@/components/accounts/batch-delete-dialog'
import { EditAccountDialog } from '@/components/accounts/edit-account-dialog'
import { ExportDialog } from '@/components/accounts/export-dialog'
import { ImportDialog } from '@/components/accounts/import-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAccountActions } from '@/hooks/use-account-actions'
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from '@/lib/components/icon-adapter'
import { UNGROUPED, compareInstitutions } from '@/lib/constants/institutions'
import { useAccountStore, useSnapshotStore, useTransactionStore } from '@/lib/stores'
import { getAccountTypeLabel } from '@/lib/utils/account-helpers'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import { getRiskLevelLabel } from '@/lib/utils/risk-level-helpers'
import { calculateCurrentDisplayBalance } from '@/lib/utils/snapshot-balance-helpers'
import { AccountType, RiskLevel } from '@/types'

import type { Account } from '@/types'

export default function AccountsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const version = useAccountStore((state) => state.version)
  const moveAccount = useAccountStore((state) => state.moveAccount)
  const updateAccount = useAccountStore((state) => state.updateAccount)
  const toggleArchive = useAccountStore((state) => state.toggleArchive)

  // 已归档账户区域是否展开（默认折叠）
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false)

  // 渠道分组折叠状态（默认全部展开）
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const toggleGroupCollapse = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }, [])

  // 筛选状态：账户类型 + 风险等级（'all' 表示不过滤）
  const [filterType, setFilterType] = useState<string>('all')
  const [filterRisk, setFilterRisk] = useState<string>('all')

  const matchesFilters = useCallback(
    (a: Account) => {
      if (filterType !== 'all' && a.type !== filterType) return false
      if (filterRisk !== 'all' && a.riskLevel !== filterRisk) return false
      return true
    },
    [filterType, filterRisk]
  )

  const hasActiveFilter = filterType !== 'all' || filterRisk !== 'all'

  // 按归档状态分组（并应用筛选）
  const { activeAccounts, archivedAccounts } = useMemo(() => {
    const activeAccounts = accounts.filter((a) => !a.archived && matchesFilters(a))
    const archivedAccounts = accounts.filter((a) => a.archived && matchesFilters(a))
    return { activeAccounts, archivedAccounts }
  }, [accounts, matchesFilters])

  // 活跃账户按渠道分组（组序：预设渠道 → 自定义 → 未分组；组内沿用账户数组顺序）
  const institutionGroups = useMemo(() => {
    const groups = new Map<string, Account[]>()
    for (const a of activeAccounts) {
      const key = a.institution?.trim() || UNGROUPED
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(a)
    }
    return Array.from(groups.entries()).sort(([a], [b]) =>
      compareInstitutions(a === UNGROUPED ? undefined : a, b === UNGROUPED ? undefined : b)
    )
  }, [activeAccounts])

  // 拖拽排序：同组内重排；跨组拖拽自动把账户移入目标渠道
  const handleReorder = useCallback(
    (draggedId: string, targetId: string) => {
      const dragged = accounts.find((a) => a.id === draggedId)
      const target = accounts.find((a) => a.id === targetId)
      moveAccount(draggedId, targetId)
      if (dragged && target && (dragged.institution || '') !== (target.institution || '')) {
        updateAccount(draggedId, { institution: target.institution })
        toast.success(`已将「${dragged.name}」移入 ${target.institution || UNGROUPED}`)
      }
    },
    [accounts, moveAccount, updateAccount]
  )

  // 筛选选项：只显示实际存在的类型/风险（按当前数据动态生成）
  const { typeOptions, riskOptions } = useMemo(() => {
    const types = new Set(accounts.map((a) => a.type))
    const risks = new Set(accounts.filter((a) => a.riskLevel).map((a) => a.riskLevel as RiskLevel))
    return {
      typeOptions: Array.from(types).map((t) => ({ value: t, label: getAccountTypeLabel(t) })),
      riskOptions: Array.from(risks).map((r) => ({ value: r, label: getRiskLevelLabel(r) })),
    }
  }, [accounts])

  // 筛选后账户的余额加总（按币种分组，避免跨币种直接相加）
  // 口径与账户卡片一致：最新快照余额 + 快照后交易变动
  const snapshots = useSnapshotStore((state) => state.snapshots)
  const transactions = useTransactionStore((state) => state.transactions)
  const filteredTotalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>()
    for (const acc of [...activeAccounts, ...archivedAccounts]) {
      const balance = calculateCurrentDisplayBalance(acc, transactions, snapshots)
      totals.set(acc.currency, (totals.get(acc.currency) ?? 0) + balance)
    }
    return Array.from(totals.entries())
  }, [activeAccounts, archivedAccounts, snapshots, transactions])

  const handleToggleArchive = useCallback(
    (id: string) => {
      const acc = accounts.find((a) => a.id === id)
      toggleArchive(id)
      toast.success(acc?.archived ? `已取消归档「${acc?.name ?? ''}」` : `已归档「${acc?.name ?? ''}」`)
    },
    [accounts, toggleArchive]
  )

  // 添加渲染日志和重复账户检测
  console.log(`[AccountsPage] 渲染页面, version: ${version}, accounts数量: ${accounts.length}`)

  // 检测重复账户（仅用于日志）
  const accountNames = accounts.map((a) => a.name)
  const duplicates = accountNames.filter((name, index) => accountNames.indexOf(name) !== index)
  const uniqueDuplicates = [...new Set(duplicates)]

  if (uniqueDuplicates.length > 0) {
    console.warn(`[AccountsPage] ⚠️ 发现重复账户:`, uniqueDuplicates)
    uniqueDuplicates.forEach((name) => {
      const duplicateAccounts = accounts.filter((a) => a.name === name)
      console.warn(
        `[AccountsPage] 账户 "${name}" 有 ${duplicateAccounts.length} 个:`,
        duplicateAccounts.map((a) => ({
          id: a.id,
          balance: a.balance,
          initialBalance: a.initialBalance,
        }))
      )
    })
  }

  if (accounts.length > 0) {
    console.log(`[AccountsPage] 第一个账户:`, {
      name: accounts[0].name,
      balance: accounts[0].balance,
      initialBalance: accounts[0].initialBalance,
    })
  }

  const { handleDelete, handleBatchDelete } = useAccountActions()
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  // 批量选择状态
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set())
  const [isBulkSelectionMode, setIsBulkSelectionMode] = useState(false)
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
  }

  // 切换批量选择模式
  const toggleBulkSelectionMode = useCallback(() => {
    setIsBulkSelectionMode((prev) => !prev)
    if (!isBulkSelectionMode) {
      setSelectedAccountIds(new Set())
    }
  }, [isBulkSelectionMode])

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedAccountIds.size === accounts.length) {
      setSelectedAccountIds(new Set())
    } else {
      setSelectedAccountIds(new Set(accounts.map((a) => a.id)))
    }
  }, [selectedAccountIds.size, accounts.length, accounts])

  // 切换单个账户选择
  const toggleAccountSelection = useCallback((accountId: string) => {
    setSelectedAccountIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
      }
      return newSet
    })
  }, [])

  // 批量删除
  const handleBatchDeleteClick = useCallback(() => {
    if (selectedAccountIds.size === 0) {
      toast.error('请选择要删除的账户')
      return
    }
    setIsBatchDeleteDialogOpen(true)
  }, [selectedAccountIds.size])

  const handleBatchDeleteConfirm = useCallback(async () => {
    setIsDeleting(true)
    try {
      await handleBatchDelete(Array.from(selectedAccountIds))
      // 清理选择状态
      setSelectedAccountIds(new Set())
      setIsBulkSelectionMode(false)
      setIsBatchDeleteDialogOpen(false)
    } catch (error) {
      console.error('批量删除失败:', error)
      toast.error('删除失败，请稍后重试')
    } finally {
      setIsDeleting(false)
    }
  }, [selectedAccountIds, handleBatchDelete])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">账户管理</h2>
          <p className="text-muted-foreground">
            按渠道分组管理您的账户；组内可拖动排序，跨组拖动自动改归属，交易和快照里的账户选择沿用这个顺序
          </p>
        </div>
        <div className="flex gap-2">
          <ExportDialog accounts={accounts} />
          <ImportDialog />
          <Button
            type={isBulkSelectionMode ? 'primary' : 'default'}
            onClick={toggleBulkSelectionMode}
            className={isBulkSelectionMode ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            {isBulkSelectionMode ? '退出批量选择' : '批量选择'}
          </Button>
          <AddAccountDialog
            trigger={
              <Button
                type="primary"
                className="bg-[#5ec850]"
                icon={<PlusIcon className="h-4 w-4" />}
              >
                添加账户
              </Button>
            }
          />
        </div>
      </div>

      {/* 批量操作栏 */}
      {isBulkSelectionMode && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedAccountIds.size > 0
                  ? `已选择 ${selectedAccountIds.size} 个账户`
                  : '点击账户卡片进行选择'}
              </span>
              {accounts.length > 0 && (
                <Button type="default" size="small" onClick={toggleSelectAll}>
                  {selectedAccountIds.size === accounts.length
                    ? '取消全选'
                    : `全选 (${accounts.length})`}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedAccountIds.size > 0 && (
                <Button
                  type="default"
                  size="small"
                  onClick={() => setSelectedAccountIds(new Set())}
                >
                  取消选择
                </Button>
              )}
              {selectedAccountIds.size > 0 && (
                <Button
                  type="primary"
                  size="small"
                  onClick={handleBatchDeleteClick}
                  className="bg-red-600 hover:bg-red-700"
                >
                  批量删除 ({selectedAccountIds.size})
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 筛选栏：账户类型 + 风险等级 */}
      {(typeOptions.length > 1 || riskOptions.length > 1) && (
        <div className="flex gap-4 items-center bg-muted/50 p-4 rounded-xl">
          <span className="text-sm font-medium text-muted-foreground shrink-0">筛选</span>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="账户类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {typeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterRisk} onValueChange={setFilterRisk}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="风险等级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部风险</SelectItem>
              {riskOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilter && (
            <Button
              type="default"
              size="small"
              onClick={() => {
                setFilterType('all')
                setFilterRisk('all')
              }}
            >
              清除筛选
            </Button>
          )}

          <div className="flex flex-col items-end gap-1 ml-auto">
            <span className="text-xs text-muted-foreground">
              {hasActiveFilter
                ? `筛选出 ${activeAccounts.length + archivedAccounts.length} / ${accounts.length} 个账户`
                : `共 ${accounts.length} 个账户`}
            </span>
            <div className="flex flex-wrap gap-3 justify-end">
              {filteredTotalsByCurrency.map(([currency, total]) => (
                <span key={currency} className="text-sm font-semibold">
                  <span className="text-muted-foreground font-normal mr-1">{currency}</span>
                  {formatCurrency(total)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      {/* 活跃账户：按渠道分组 */}
      <div className="space-y-6">
        {institutionGroups.map(([group, groupAccounts]) => {
          // 组内余额小计（按币种，口径与卡片一致）
          const totals = new Map<string, number>()
          for (const acc of groupAccounts) {
            const balance = calculateCurrentDisplayBalance(acc, transactions, snapshots)
            totals.set(acc.currency, (totals.get(acc.currency) ?? 0) + balance)
          }
          const isCollapsed = collapsedGroups.has(group)
          return (
            <section key={group}>
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => toggleGroupCollapse(group)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                    'text-sm font-semibold',
                    'hover:bg-muted/50 transition'
                  )}
                >
                  {isCollapsed ? (
                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{group}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {groupAccounts.length} 个账户
                  </span>
                </button>
                <div className="h-px flex-1 bg-border" />
                <div className="flex flex-wrap gap-3 justify-end">
                  {Array.from(totals.entries()).map(([currency, total]) => (
                    <span key={currency} className="text-sm font-semibold">
                      <span className="text-muted-foreground font-normal mr-1">{currency}</span>
                      {formatCurrency(total)}
                    </span>
                  ))}
                </div>
              </div>

              {!isCollapsed && (
                <AccountGrid
                  key={`grp-${group}-${version}`}
                  accounts={groupAccounts}
                  onDelete={handleDelete}
                  onEdit={handleEditAccount}
                  onToggleArchive={handleToggleArchive}
                  onReorder={handleReorder}
                  selectedAccountIds={selectedAccountIds}
                  onToggleSelection={toggleAccountSelection}
                  isBulkSelectionMode={isBulkSelectionMode}
                />
              )}
            </section>
          )
        })}
      </div>

      {/* 已归档账户（可折叠） */}
      {archivedAccounts.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setIsArchivedExpanded((v) => !v)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 mb-3 rounded-lg',
              'text-sm font-medium text-muted-foreground',
              'hover:bg-muted/50 transition'
            )}
          >
            {isArchivedExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
            <span>已归档账户（{archivedAccounts.length}）</span>
          </button>

          {isArchivedExpanded && (
            <div className="opacity-70">
              <AccountGrid
                key={`archived-${version}`}
                accounts={archivedAccounts}
                onDelete={handleDelete}
                onEdit={handleEditAccount}
                onToggleArchive={handleToggleArchive}
                selectedAccountIds={selectedAccountIds}
                onToggleSelection={toggleAccountSelection}
                isBulkSelectionMode={isBulkSelectionMode}
                emptyMessage="暂无已归档账户"
              />
            </div>
          )}
        </div>
      )}

      {/* 编辑对话框 */}
      {editingAccount && (
        <EditAccountDialog
          account={editingAccount}
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
        />
      )}

      {/* 批量删除对话框 */}
      <BatchDeleteDialog
        open={isBatchDeleteDialogOpen}
        onOpenChange={setIsBatchDeleteDialogOpen}
        accounts={accounts.filter((acc) => selectedAccountIds.has(acc.id))}
        onConfirm={handleBatchDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  )
}
