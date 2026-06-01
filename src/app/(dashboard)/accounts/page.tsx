'use client'

import { Divider , Button } from 'animal-island-ui'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

import { AccountGrid } from '@/components/accounts/account-grid'
import { AddAccountDialog } from '@/components/accounts/add-account-dialog'
import { BatchDeleteDialog } from '@/components/accounts/batch-delete-dialog'
import { EditAccountDialog } from '@/components/accounts/edit-account-dialog'
import { ExportDialog } from '@/components/accounts/export-dialog'
import { ImportDialog } from '@/components/accounts/import-dialog'
import { useAccountActions } from '@/hooks/use-account-actions'
import { PlusIcon } from '@/lib/components/icon-adapter'
import { useAccountStore } from '@/lib/stores'

import type { Account } from '@/types'

export default function AccountsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const version = useAccountStore((state) => state.version)
  const deleteAccount = useAccountStore((state) => state.deleteAccount)

  // 自动清理重复账户
  useEffect(() => {
    const accountNames = accounts.map((a) => a.name)
    const duplicates = accountNames.filter((name, index) => accountNames.indexOf(name) !== index)
    const uniqueDuplicates = [...new Set(duplicates)]

    if (uniqueDuplicates.length > 0) {
      console.log(`[AccountsPage] 发现重复账户，开始清理...`)

      uniqueDuplicates.forEach((name) => {
        const duplicateAccounts = accounts.filter((a) => a.name === name)
        if (duplicateAccounts.length > 1) {
          // 保留最新的（updatedAt最新的），删除其他的
          const sorted = [...duplicateAccounts].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )

          const toKeep = sorted[0]
          const toDelete = sorted.slice(1)

          console.log(
            `[账户清理] "${name}": 保留 ${toKeep.id} (initialBalance: ${toKeep.initialBalance})`
          )

          toDelete.forEach((acc) => {
            console.log(`[账户清理] 删除重复账户 ${acc.id} (initialBalance: ${acc.initialBalance})`)
            deleteAccount(acc.id)
          })
        }
      })

      toast.success(`已清理 ${uniqueDuplicates.length} 个重复账户`)
    }
  }, [accounts, deleteAccount])

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
          <p className="text-muted-foreground">管理您的所有投资账户</p>
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

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      <AccountGrid
        key={version}
        accounts={accounts}
        onDelete={handleDelete}
        onEdit={handleEditAccount}
        selectedAccountIds={selectedAccountIds}
        onToggleSelection={toggleAccountSelection}
        isBulkSelectionMode={isBulkSelectionMode}
      />

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
