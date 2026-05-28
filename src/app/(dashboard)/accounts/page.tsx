'use client'

import { useState, useEffect } from 'react'
import { useAccountStore } from '@/lib/stores'
import { Divider } from 'animal-island-ui'
import { AccountGrid } from '@/components/accounts/account-grid'
import { AddAccountDialog } from '@/components/accounts/add-account-dialog'
import { EditAccountDialog } from '@/components/accounts/edit-account-dialog'
import { ExportDialog } from '@/components/accounts/export-dialog'
import { ImportDialog } from '@/components/accounts/import-dialog'
import { useAccountActions } from '@/hooks/use-account-actions'
import type { Account } from '@/types'
import { Button } from 'animal-island-ui'
import { PlusIcon } from '@/lib/components/icon-adapter'
import { toast } from 'sonner'

export default function AccountsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const version = useAccountStore((state) => state.version)
  const deleteAccount = useAccountStore((state) => state.deleteAccount)

  // 自动清理重复账户
  useEffect(() => {
    const accountNames = accounts.map(a => a.name)
    const duplicates = accountNames.filter((name, index) => accountNames.indexOf(name) !== index)
    const uniqueDuplicates = [...new Set(duplicates)]

    if (uniqueDuplicates.length > 0) {
      console.log(`[AccountsPage] 发现重复账户，开始清理...`)

      uniqueDuplicates.forEach(name => {
        const duplicateAccounts = accounts.filter(a => a.name === name)
        if (duplicateAccounts.length > 1) {
          // 保留最新的（updatedAt最新的），删除其他的
          const sorted = [...duplicateAccounts].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )

          const toKeep = sorted[0]
          const toDelete = sorted.slice(1)

          console.log(`[账户清理] "${name}": 保留 ${toKeep.id} (initialBalance: ${toKeep.initialBalance})`)

          toDelete.forEach(acc => {
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
  const accountNames = accounts.map(a => a.name)
  const duplicates = accountNames.filter((name, index) => accountNames.indexOf(name) !== index)
  const uniqueDuplicates = [...new Set(duplicates)]

  if (uniqueDuplicates.length > 0) {
    console.warn(`[AccountsPage] ⚠️ 发现重复账户:`, uniqueDuplicates)
    uniqueDuplicates.forEach(name => {
      const duplicateAccounts = accounts.filter(a => a.name === name)
      console.warn(`[AccountsPage] 账户 "${name}" 有 ${duplicateAccounts.length} 个:`, duplicateAccounts.map(a => ({
        id: a.id,
        balance: a.balance,
        initialBalance: a.initialBalance
      })))
    })
  }

  if (accounts.length > 0) {
    console.log(`[AccountsPage] 第一个账户:`, {
      name: accounts[0].name,
      balance: accounts[0].balance,
      initialBalance: accounts[0].initialBalance
    })
  }

  const { handleDelete } = useAccountActions()
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">账户管理</h2>
          <p className="text-muted-foreground">
            管理您的所有投资账户
          </p>
        </div>
        <div className="flex gap-2">
          <ExportDialog accounts={accounts} />
          <ImportDialog />
          <AddAccountDialog
            trigger={
              <Button type="primary" className="bg-[#5ec850]" icon={<PlusIcon className="h-4 w-4" />}>
                添加账户
              </Button>
            }
          />
        </div>
      </div>

      <Divider type="line-yellow" style={{ margin: '24px 0' }} />

      <AccountGrid
        key={version}
        accounts={accounts}
        onDelete={handleDelete}
        onEdit={handleEditAccount}
      />

      {/* 编辑对话框 */}
      {editingAccount && (
        <EditAccountDialog
          account={editingAccount}
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
        />
      )}
    </div>
  )
}
