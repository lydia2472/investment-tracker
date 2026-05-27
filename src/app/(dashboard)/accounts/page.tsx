'use client'

import { useState } from 'react'
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

export default function AccountsPage() {
  const accounts = useAccountStore((state) => state.accounts)
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
